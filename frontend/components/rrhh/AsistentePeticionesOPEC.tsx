import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import {
  nominaService,
  ResultadoPeticionOPEC,
  CatalogoOPEC,
  PlazaNomina,
} from '../../lib/nominaService';

const THEME = {
  primary: '#BE1F2D', // Rojo Bogotá
  primaryDark: '#991522',
  marca900: '#0D2A48',
  marca800: '#123A63',
  marca700: '#174A7E',
  marca600: '#1F5A96',
  marca100: '#D6E4F4',
  marca50: '#EEF4FB',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  white: '#FFFFFF',
  emeraldBg: '#ECFDF5',
  emeraldText: '#047857',
  roseBg: '#FFF1F2',
  roseText: '#BE123C',
  amberBg: '#FFFBEB',
  amberText: '#92400E',
  skyBg: '#F0F9FF',
  skyText: '#0369A1',
};

export default function AsistentePeticionesOPEC() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 640;

  // Estados de consulta
  const [opecInput, setOpecInput] = useState('220280');
  const [peticionario, setPeticionario] = useState('Peticionario(a) / Aspirante Elegible');
  const [radicado, setRadicado] = useState('2026-ER-00984');
  const [modoAvanzado, setModoAvanzado] = useState(false);
  const [codigoInput, setCodigoInput] = useState('');
  const [gradoInput, setGradoInput] = useState('');
  const [cargoInput, setCargoInput] = useState('');

  // Estados de catálogo y carga
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [catalogoOpecs, setCatalogoOpecs] = useState<CatalogoOPEC[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPeticionOPEC | null>(null);

  // Pestaña activa del resultado: 'literales' | 'oficio' | 'matriz'
  const [tabResultado, setTabResultado] = useState<'literales' | 'oficio' | 'matriz'>('literales');

  // Modal genérico para mensajes (Regla: usar modals en lugar de alerts)
  const [modalAvisoVisible, setModalAvisoVisible] = useState(false);
  const [modalAvisoContenido, setModalAvisoContenido] = useState<{
    titulo: string;
    mensaje: string;
    tipo: 'exito' | 'error' | 'info';
  }>({ titulo: '', mensaje: '', tipo: 'info' });

  // Modal para editar datos de vacancia o SIMO en una plaza
  const [modalEditarPlazaVisible, setModalEditarPlazaVisible] = useState(false);
  const [plazaEnEdicion, setPlazaEnEdicion] = useState<any | null>(null);
  const [editFechaVacancia, setEditFechaVacancia] = useState('');
  const [editFechaReporteSimo, setEditFechaReporteSimo] = useState('');
  const [editProcesoSeleccion, setEditProcesoSeleccion] = useState('');
  const [editOpec, setEditOpec] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [guardandoPlaza, setGuardandoPlaza] = useState(false);

  // Cargar catálogo de OPECs al iniciar
  useEffect(() => {
    cargarCatalogo();
  }, []);

  const mostrarModal = (titulo: string, mensaje: string, tipo: 'exito' | 'error' | 'info' = 'info') => {
    setModalAvisoContenido({ titulo, mensaje, tipo });
    setModalAvisoVisible(true);
  };

  const cargarCatalogo = async () => {
    try {
      setCargandoCatalogo(true);
      const res = await nominaService.listarOpecsDisponibles();
      setCatalogoOpecs(res.opecs || []);
    } catch (e: any) {
      console.warn('Error al cargar catálogo OPEC:', e);
    } finally {
      setCargandoCatalogo(false);
    }
  };

  const handleConsultar = async (opecAUsar?: string) => {
    const opecFinal = (opecAUsar || opecInput).trim();
    if (!opecFinal && !codigoInput.trim() && !cargoInput.trim()) {
      mostrarModal(
        'Campo Requerido',
        'Por favor ingrese el número de OPEC (ej: 220280) o complete el código y grado del empleo a consultar.',
        'error'
      );
      return;
    }

    try {
      setBuscando(true);
      const res = await nominaService.consultarPeticionOPEC({
        opec: opecFinal,
        codigo: codigoInput,
        grado: gradoInput,
        cargo: cargoInput,
        peticionario: peticionario.trim() || 'Peticionario(a)',
        radicado: radicado.trim() || 'S/N',
      });

      if (!res.success) {
        mostrarModal('Error en la Consulta', res.mensaje || 'No fue posible realizar la consulta.', 'error');
        return;
      }

      setResultado(res);
      if (!res.encontrado) {
        mostrarModal(
          'Empleo No Encontrado',
          res.mensaje || 'No se hallaron registros en la planta de personal con los parámetros indicados.',
          'info'
        );
      }
    } catch (e: any) {
      mostrarModal('Fallo de Conexión', e.message || 'Error al conectar con el servidor.', 'error');
    } finally {
      setBuscando(false);
    }
  };

  // Copiar el borrador del oficio formal al portapapeles
  const handleCopiarOficio = () => {
    if (!resultado?.oficio_borrador) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(resultado.oficio_borrador);
      }
      mostrarModal(
        'Copiado al Portapapeles',
        'El texto formal de respuesta institucional ha sido copiado correctamente. Puede pegarlo directamente en el sistema de correspondencia / Orfeo o su procesador de texto.',
        'exito'
      );
    } catch (err: any) {
      mostrarModal('Atención', 'No se pudo acceder al portapapeles automáticamente.', 'error');
    }
  };

  // Exportar matriz técnica a Excel
  const handleExportarExcel = () => {
    if (!resultado || !resultado.plazas || resultado.plazas.length === 0) {
      mostrarModal('Sin Datos', 'No hay plazas para exportar.', 'info');
      return;
    }

    try {
      const dataParaExcel = resultado.plazas.map((p) => ({
        'No. Plaza': p.id_plaza,
        'Denominación Cargo': p.cargo,
        'Código': p.codigo,
        'Grado': p.grado,
        'Nivel': p.nivel,
        'Dependencia': p.dependencia_cargo,
        'Estado Cargo': p.estado_cargo,
        'Titular / Ocupante': p.titular_nombre || 'VACANTE',
        'Cédula Titular': p.titular_cedula || '',
        'Modalidad Vinculación': p.tipo_vinculacion || '',
        'Situación Administrativa': p.situacion_administrativa || '',
        'Es Encargo': p.es_encargo ? 'SÍ' : 'NO',
        'Encargado Nombre': p.encargo_nombre || '',
        'OPEC SIMO': p.opec || 'No reportada',
        'Fecha Vacancia Definitiva': p.fecha_vacancia || 'N/A',
        'Fecha Reporte SIMO': p.fecha_reporte_simo || 'N/A',
        'Proceso de Selección': p.proceso_seleccion_simo || '',
        'Notas': p.notas_peticion || '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataParaExcel);
      XLSX.utils.book_append_sheet(wb, ws, 'Matriz Plazas Equivalentes');

      const nombreArchivo = `Matriz_OPEC_${resultado.opec_buscada || resultado.identificacion?.codigo || 'Consulta'}_${Date.now()}.xlsx`;

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, nombreArchivo);
        mostrarModal(
          'Descarga Iniciada',
          `Se ha generado el archivo Excel "${nombreArchivo}" con la matriz de soporte para el derecho de petición.`,
          'exito'
        );
      } else {
        mostrarModal('Información', 'Exportación disponible en entorno web.', 'info');
      }
    } catch (err: any) {
      mostrarModal('Error', 'No fue posible exportar el archivo Excel: ' + err.message, 'error');
    }
  };

  // Abrir modal de edición de plaza
  const abrirEdicionPlaza = (plaza: any) => {
    setPlazaEnEdicion(plaza);
    setEditFechaVacancia(plaza.fecha_vacancia ? plaza.fecha_vacancia.split('T')[0] : '');
    setEditFechaReporteSimo(plaza.fecha_reporte_simo ? plaza.fecha_reporte_simo.split('T')[0] : '');
    setEditProcesoSeleccion(plaza.proceso_seleccion_simo || 'Proceso de Selección Distrito Capital');
    setEditOpec(plaza.opec || '');
    setEditNotas(plaza.notas_peticion || '');
    setModalEditarPlazaVisible(true);
  };

  // Guardar datos editados de la plaza
  const guardarEdicionPlaza = async () => {
    if (!plazaEnEdicion) return;
    try {
      setGuardandoPlaza(true);
      const res = await nominaService.actualizarPlazaPeticion(plazaEnEdicion.id_plaza, {
        fecha_vacancia: editFechaVacancia.trim() || undefined,
        fecha_reporte_simo: editFechaReporteSimo.trim() || undefined,
        proceso_seleccion_simo: editProcesoSeleccion.trim() || undefined,
        opec: editOpec.trim() || undefined,
        notas_peticion: editNotas.trim() || undefined,
      });

      if (!res.success) {
        mostrarModal('Error', res.error || 'No se pudo actualizar la plaza.', 'error');
        return;
      }

      setModalEditarPlazaVisible(false);
      mostrarModal('Plaza Actualizada', 'Los datos de la plaza han sido actualizados en la base de datos.', 'exito');
      // Recargar consulta actual
      handleConsultar();
    } catch (e: any) {
      mostrarModal('Error', e.message || 'Error al guardar.', 'error');
    } finally {
      setGuardandoPlaza(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.slate50 }}>
      {/* =========================================================
          ENCABEZADO DEL ASISTENTE
      ========================================================= */}
      <View
        style={{
          backgroundColor: THEME.white,
          borderBottomWidth: 1,
          borderBottomColor: THEME.slate200,
          paddingHorizontal: isDesktop ? 28 : 16,
          paddingVertical: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: THEME.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="scale-outline" size={22} color={THEME.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: isDesktop ? 20 : 18, fontWeight: '700', color: THEME.slate900 }}>
              Asistente de Respuestas a Derechos de Petición (OPEC y Planta)
            </Text>
            <Text style={{ fontSize: 13, color: THEME.slate500, marginTop: 2 }}>
              Responde instantáneamente a requerimientos sobre empleos iguales/equivalentes, vacancias definitivas y reporte en SIMO.
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: isDesktop ? 28 : 16,
          paddingVertical: 24,
          maxWidth: 1280,
          width: '100%',
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================================================
            PANEL DE BÚSQUEDA Y CONFIGURACIÓN
        ========================================================= */}
        <View
          style={{
            backgroundColor: THEME.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: THEME.slate200,
            padding: isDesktop ? 20 : 16,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate800, marginBottom: 14 }}>
            1. Ingrese los datos de la Petición y Número de OPEC
          </Text>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14, marginBottom: 14 }}>
            {/* Input OPEC */}
            <View style={{ flex: isDesktop ? 1.4 : 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700, marginBottom: 6 }}>
                Número de OPEC a Consultar *
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: THEME.slate50,
                  borderWidth: 1.5,
                  borderColor: THEME.marca600,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                }}
              >
                <Ionicons name="barcode-outline" size={18} color={THEME.marca700} style={{ marginRight: 8 }} />
                <TextInput
                  value={opecInput}
                  onChangeText={setOpecInput}
                  placeholder="Ej: 220280"
                  placeholderTextColor={THEME.slate400}
                  style={{
                    flex: 1,
                    height: 44,
                    fontSize: 15,
                    fontWeight: '700',
                    color: THEME.slate900,
                  }}
                />
              </View>
            </View>

            {/* Input Peticionario */}
            <View style={{ flex: 1.5 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700, marginBottom: 6 }}>
                Nombre del Peticionario / Destinatario
              </Text>
              <TextInput
                value={peticionario}
                onChangeText={setPeticionario}
                placeholder="Nombre o Elegible"
                placeholderTextColor={THEME.slate400}
                style={{
                  height: 44,
                  backgroundColor: THEME.slate50,
                  borderWidth: 1,
                  borderColor: THEME.slate300,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  fontSize: 14,
                  color: THEME.slate900,
                }}
              />
            </View>

            {/* Input Radicado */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700, marginBottom: 6 }}>
                Radicado Petición
              </Text>
              <TextInput
                value={radicado}
                onChangeText={setRadicado}
                placeholder="2026-ER-XXXXX"
                placeholderTextColor={THEME.slate400}
                style={{
                  height: 44,
                  backgroundColor: THEME.slate50,
                  borderWidth: 1,
                  borderColor: THEME.slate300,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  fontSize: 14,
                  color: THEME.slate900,
                }}
              />
            </View>

            {/* Botón Consultar */}
            <View style={{ justifyContent: 'flex-end' }}>
              <Pressable
                onPress={() => handleConsultar()}
                disabled={buscando}
                style={({ hovered }: any) => ({
                  height: 44,
                  backgroundColor: hovered ? THEME.primaryDark : THEME.primary,
                  borderRadius: 8,
                  paddingHorizontal: 22,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: buscando ? 0.7 : 1,
                })}
              >
                {buscando ? (
                  <ActivityIndicator color={THEME.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={17} color={THEME.white} style={{ marginRight: 8 }} />
                    <Text style={{ color: THEME.white, fontWeight: '700', fontSize: 14 }}>
                      Consultar y Generar
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {/* Chips de OPECs disponibles en la entidad para clic rápido */}
          {catalogoOpecs.length > 0 && (
            <View style={{ marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: THEME.slate100 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate500, marginBottom: 8 }}>
                OPECs identificadas en la planta (clic para consultar de inmediato):
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {catalogoOpecs.slice(0, 14).map((item) => (
                  <Pressable
                    key={item.opec}
                    onPress={() => {
                      setOpecInput(item.opec);
                      handleConsultar(item.opec);
                    }}
                    style={({ hovered }: any) => ({
                      backgroundColor: opecInput === item.opec ? THEME.marca100 : hovered ? THEME.slate200 : THEME.slate100,
                      borderWidth: 1,
                      borderColor: opecInput === item.opec ? THEME.marca600 : THEME.slate300,
                      borderRadius: 6,
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: opecInput === item.opec ? THEME.marca800 : THEME.slate700,
                      }}
                    >
                      {item.opec}
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.slate500, marginLeft: 4 }}>
                      ({item.cargo.split(' ')[0]} {item.codigo}-{item.grado})
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Opciones de Búsqueda Avanzada colapsable */}
          <Pressable
            onPress={() => setModoAvanzado(!modoAvanzado)}
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}
          >
            <Ionicons
              name={modoAvanzado ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={THEME.marca700}
              style={{ marginRight: 4 }}
            />
            <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.marca700 }}>
              {modoAvanzado ? 'Ocultar filtros avanzados de cargo/código/grado' : 'Búsqueda manual por Código y Grado o Denominación'}
            </Text>
          </Pressable>

          {modoAvanzado && (
            <View
              style={{
                marginTop: 12,
                padding: 14,
                backgroundColor: THEME.slate50,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: THEME.slate200,
                flexDirection: isDesktop ? 'row' : 'column',
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate600, marginBottom: 4 }}>Código</Text>
                <TextInput
                  value={codigoInput}
                  onChangeText={setCodigoInput}
                  placeholder="Ej: 222"
                  style={{ height: 38, borderWidth: 1, borderColor: THEME.slate300, borderRadius: 6, paddingHorizontal: 10, backgroundColor: THEME.white, fontSize: 13 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate600, marginBottom: 4 }}>Grado</Text>
                <TextInput
                  value={gradoInput}
                  onChangeText={setGradoInput}
                  placeholder="Ej: 19"
                  style={{ height: 38, borderWidth: 1, borderColor: THEME.slate300, borderRadius: 6, paddingHorizontal: 10, backgroundColor: THEME.white, fontSize: 13 }}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate600, marginBottom: 4 }}>Denominación</Text>
                <TextInput
                  value={cargoInput}
                  onChangeText={setCargoInput}
                  placeholder="Ej: PROFESIONAL ESPECIALIZADO"
                  style={{ height: 38, borderWidth: 1, borderColor: THEME.slate300, borderRadius: 6, paddingHorizontal: 10, backgroundColor: THEME.white, fontSize: 13 }}
                />
              </View>
            </View>
          )}
        </View>

        {/* =========================================================
            RESULTADOS Y GENERADOR DE RESPUESTA
        ========================================================= */}
        {resultado && resultado.encontrado && (
          <View>
            {/* KPI Cards de Resumen */}
            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: 12,
                marginBottom: 20,
              }}
            >
              {/* Empleo Base */}
              <View
                style={{
                  flex: 1.5,
                  backgroundColor: THEME.white,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 14,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                  Empleo Base Identificado
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: THEME.marca900, marginTop: 4 }}>
                  {resultado.identificacion?.cargo}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ backgroundColor: THEME.slate100, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700 }}>
                      Cód. {resultado.identificacion?.codigo}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: THEME.slate100, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700 }}>
                      Grado {resultado.identificacion?.grado}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: THEME.slate100, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700 }}>
                      Nivel {resultado.identificacion?.nivel}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Total Empleos */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: THEME.white,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase' }}>
                  e. Total Plazas Creadas
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: THEME.slate900, marginTop: 2 }}>
                  {resultado.conteo?.total_empleos}
                </Text>
                <Text style={{ fontSize: 11, color: THEME.slate500 }}>empleos en planta</Text>
              </View>

              {/* Vacantes Definitivas */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: (resultado.conteo?.vacantes_definitivas || 0) > 0 ? THEME.roseBg : THEME.emeraldBg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: (resultado.conteo?.vacantes_definitivas || 0) > 0 ? '#FDA4AF' : '#A7F3D0',
                  padding: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: (resultado.conteo?.vacantes_definitivas || 0) > 0 ? THEME.roseText : THEME.emeraldText,
                    textTransform: 'uppercase',
                  }}
                >
                  f. Vacantes Definitivas
                </Text>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: (resultado.conteo?.vacantes_definitivas || 0) > 0 ? THEME.roseText : THEME.emeraldText,
                    marginTop: 2,
                  }}
                >
                  {resultado.conteo?.vacantes_definitivas}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: (resultado.conteo?.vacantes_definitivas || 0) > 0 ? THEME.roseText : THEME.emeraldText,
                  }}
                >
                  {(resultado.conteo?.vacantes_definitivas || 0) > 0 ? 'Con vacancia' : 'Todas provistas'}
                </Text>
              </View>

              {/* Provisión Actual */}
              <View
                style={{
                  flex: 1.2,
                  backgroundColor: THEME.white,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 14,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.slate500, textTransform: 'uppercase', marginBottom: 4 }}>
                  Modalidades de Provisión
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate700 }}>
                  • Periodo Prueba: <Text style={{ fontWeight: '700' }}>{resultado.conteo?.periodo_prueba || 0}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate700 }}>
                  • Carrera en Propiedad: <Text style={{ fontWeight: '700' }}>{resultado.conteo?.carrera || 0}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate700 }}>
                  • Encargos: <Text style={{ fontWeight: '700' }}>{resultado.conteo?.encargo || 0}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate700 }}>
                  • Provisionales: <Text style={{ fontWeight: '700' }}>{resultado.conteo?.provisional || 0}</Text>
                </Text>
              </View>
            </View>

            {/* Selector de Pestañas de Resultados */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: THEME.white,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: THEME.slate200,
                padding: 4,
                marginBottom: 16,
              }}
            >
              <Pressable
                onPress={() => setTabResultado('literales')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 8,
                  backgroundColor: tabResultado === 'literales' ? THEME.marca700 : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: tabResultado === 'literales' ? THEME.white : THEME.slate600,
                  }}
                >
                  📋 Literales a - i (Resumen Estructurado)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setTabResultado('oficio')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 8,
                  backgroundColor: tabResultado === 'oficio' ? THEME.marca700 : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: tabResultado === 'oficio' ? THEME.white : THEME.slate600,
                  }}
                >
                  📄 Oficio de Respuesta (Borrador Institucional)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setTabResultado('matriz')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 8,
                  backgroundColor: tabResultado === 'matriz' ? THEME.marca700 : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: tabResultado === 'matriz' ? THEME.marca700 : THEME.slate600,
                  }}
                >
                  📊 Matriz de Plazas y Soporte Técnico
                </Text>
              </Pressable>
            </View>

            {/* =======================================================
                CONTENIDO 1: LITERALES a - i ESTRUCTURADOS
            ======================================================= */}
            {tabResultado === 'literales' && (
              <View style={{ gap: 12 }}>
                {[
                  {
                    letra: 'a',
                    titulo: 'Denominación del Empleo',
                    contenido: resultado.literales?.a_denominacion,
                    icono: 'briefcase-outline',
                  },
                  {
                    letra: 'b',
                    titulo: 'Código',
                    contenido: resultado.literales?.b_codigo,
                    icono: 'keypad-outline',
                  },
                  {
                    letra: 'c',
                    titulo: 'Grado',
                    contenido: resultado.literales?.c_grado,
                    icono: 'podium-outline',
                  },
                  {
                    letra: 'd',
                    titulo: 'Dependencia(s) en que se ubican los empleos',
                    contenido: resultado.literales?.d_dependencias,
                    icono: 'business-outline',
                  },
                  {
                    letra: 'e',
                    titulo: 'Número de Empleos Existentes en Planta',
                    contenido: resultado.literales?.e_numero_empleos,
                    icono: 'layers-outline',
                  },
                  {
                    letra: 'f',
                    titulo: 'Número de Vacantes Definitivas',
                    contenido: resultado.literales?.f_vacantes_definitivas,
                    icono: 'alert-circle-outline',
                  },
                  {
                    letra: 'g',
                    titulo: 'Fecha en que se produjo la vacancia definitiva',
                    contenido: resultado.literales?.g_fecha_vacancia,
                    icono: 'calendar-outline',
                  },
                  {
                    letra: 'h',
                    titulo: 'Situación administrativa actual de cada empleo',
                    contenido: resultado.literales?.h_situacion_administrativa,
                    icono: 'person-outline',
                  },
                  {
                    letra: 'i',
                    titulo: 'Si la vacante fue reportada en SIMO y fecha del reporte',
                    contenido: resultado.literales?.i_reporte_simo,
                    icono: 'cloud-done-outline',
                  },
                ].map((item) => (
                  <View
                    key={item.letra}
                    style={{
                      backgroundColor: THEME.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 9999,
                          backgroundColor: THEME.marca100,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.marca800 }}>
                          {item.letra}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900, flex: 1 }}>
                        {item.titulo}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13.5,
                        lineHeight: 20,
                        color: THEME.slate700,
                        paddingLeft: 38,
                      }}
                    >
                      {item.contenido}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* =======================================================
                CONTENIDO 2: OFICIO DE RESPUESTA FORMAL
            ======================================================= */}
            {tabResultado === 'oficio' && (
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 20,
                }}
              >
                <View
                  style={{
                    flexDirection: isDesktop ? 'row' : 'column',
                    justifyContent: 'space-between',
                    alignItems: isDesktop ? 'center' : 'flex-start',
                    marginBottom: 16,
                    paddingBottom: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: THEME.slate200,
                    gap: 10,
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: THEME.slate900 }}>
                      Minuta Oficial de Respuesta Institucional
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.slate500 }}>
                      Texto articulado conforme a los estándares de correspondencia y carrera administrativa.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={handleCopiarOficio}
                      style={({ hovered }: any) => ({
                        backgroundColor: hovered ? THEME.marca800 : THEME.marca700,
                        paddingVertical: 9,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                      })}
                    >
                      <Ionicons name="copy-outline" size={16} color={THEME.white} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.white }}>
                        Copiar al Portapapeles
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleExportarExcel}
                      style={({ hovered }: any) => ({
                        backgroundColor: hovered ? THEME.slate100 : THEME.white,
                        borderWidth: 1,
                        borderColor: THEME.slate300,
                        paddingVertical: 9,
                        paddingHorizontal: 14,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                      })}
                    >
                      <Ionicons name="download-outline" size={16} color={THEME.slate700} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate700 }}>
                        Exportar Matriz Excel
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Vista previa del documento */}
                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 20,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
                      fontSize: 13,
                      lineHeight: 22,
                      color: THEME.slate800,
                    }}
                  >
                    {resultado.oficio_borrador}
                  </Text>
                </View>
              </View>
            )}

            {/* =======================================================
                CONTENIDO 3: MATRIZ DE PLAZAS Y SOPORTE
            ======================================================= */}
            {tabResultado === 'matriz' && (
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900 }}>
                    Detalle de las {resultado.plazas?.length || 0} Plazas Equivalentes en Planta
                  </Text>
                  <Pressable
                    onPress={handleExportarExcel}
                    style={{
                      backgroundColor: THEME.emeraldBg,
                      borderWidth: 1,
                      borderColor: '#A7F3D0',
                      borderRadius: 6,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="download-outline" size={15} color={THEME.emeraldText} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.emeraldText }}>
                      Descargar Anexo Excel
                    </Text>
                  </Pressable>
                </View>

                {/* Tabla de plazas */}
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={{ minWidth: 900 }}>
                    {/* Encabezado tabla */}
                    <View
                      style={{
                        flexDirection: 'row',
                        backgroundColor: THEME.slate100,
                        borderBottomWidth: 1,
                        borderBottomColor: THEME.slate300,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ width: 70, fontWeight: '700', fontSize: 12, color: THEME.slate700 }}>Plaza</Text>
                      <Text style={{ width: 220, fontWeight: '700', fontSize: 12, color: THEME.slate700 }}>Dependencia</Text>
                      <Text style={{ width: 200, fontWeight: '700', fontSize: 12, color: THEME.slate700 }}>Titular / Ocupante</Text>
                      <Text style={{ width: 140, fontWeight: '700', fontSize: 12, color: THEME.slate700 }}>Vinculación</Text>
                      <Text style={{ width: 120, fontWeight: '700', fontSize: 12, color: THEME.slate700 }}>Estado Cargo</Text>
                      <Text style={{ width: 100, fontWeight: '700', fontSize: 12, color: THEME.slate700 }}>OPEC SIMO</Text>
                      <Text style={{ width: 80, fontWeight: '700', fontSize: 12, color: THEME.slate700 }}>Acciones</Text>
                    </View>

                    {/* Filas */}
                    {resultado.plazas?.map((p, idx) => (
                      <View
                        key={p.id_plaza}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.slate200,
                          backgroundColor: idx % 2 === 0 ? THEME.white : THEME.slate50,
                        }}
                      >
                        <Text style={{ width: 70, fontWeight: '700', fontSize: 12, color: THEME.marca800 }}>
                          #{p.id_plaza}
                        </Text>
                        <Text style={{ width: 220, fontSize: 12, color: THEME.slate800 }}>
                          {p.dependencia_cargo}
                        </Text>
                        <View style={{ width: 200 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate900 }}>
                            {p.titular_nombre || 'VACANTE DEFINITIVA'}
                          </Text>
                          {p.titular_cedula && (
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                              C.C. {p.titular_cedula}
                            </Text>
                          )}
                        </View>
                        <View style={{ width: 140 }}>
                          <Text style={{ fontSize: 11, color: THEME.slate700 }}>
                            {p.tipo_vinculacion || 'N/A'}
                          </Text>
                        </View>
                        <View style={{ width: 120 }}>
                          <View
                            style={{
                              backgroundColor:
                                p.estado_cargo === 'VACANTE DEFINITIVA'
                                  ? THEME.roseBg
                                  : p.estado_cargo === 'VACANTE TEMPORAL'
                                  ? THEME.amberBg
                                  : THEME.emeraldBg,
                              borderRadius: 4,
                              paddingVertical: 2,
                              paddingHorizontal: 6,
                              alignSelf: 'flex-start',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color:
                                  p.estado_cargo === 'VACANTE DEFINITIVA'
                                    ? THEME.roseText
                                    : p.estado_cargo === 'VACANTE TEMPORAL'
                                    ? THEME.amberText
                                    : THEME.emeraldText,
                              }}
                            >
                              {p.estado_cargo}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ width: 100, fontSize: 12, fontWeight: '700', color: THEME.slate800 }}>
                          {p.opec || '—'}
                        </Text>
                        <View style={{ width: 80 }}>
                          <Pressable
                            onPress={() => abrirEdicionPlaza(p)}
                            style={{
                              backgroundColor: THEME.marca50,
                              borderRadius: 4,
                              paddingVertical: 4,
                              paddingHorizontal: 8,
                              borderWidth: 1,
                              borderColor: THEME.marca100,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca700 }}>
                              Editar
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* =========================================================
          MODAL GENÉRICO DE AVISO (Regla: Modals en vez de alerts)
      ========================================================= */}
      <Modal
        visible={modalAvisoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalAvisoVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 14,
              width: '100%',
              maxWidth: 440,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor:
                    modalAvisoContenido.tipo === 'exito'
                      ? THEME.emeraldBg
                      : modalAvisoContenido.tipo === 'error'
                      ? THEME.roseBg
                      : THEME.skyBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name={
                    modalAvisoContenido.tipo === 'exito'
                      ? 'checkmark-circle-outline'
                      : modalAvisoContenido.tipo === 'error'
                      ? 'alert-circle-outline'
                      : 'information-circle-outline'
                  }
                  size={30}
                  color={
                    modalAvisoContenido.tipo === 'exito'
                      ? THEME.emeraldText
                      : modalAvisoContenido.tipo === 'error'
                      ? THEME.roseText
                      : THEME.skyText
                  }
                />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: THEME.slate900, textAlign: 'center' }}>
                {modalAvisoContenido.titulo}
              </Text>
            </View>

            <Text style={{ fontSize: 14, lineHeight: 21, color: THEME.slate600, textAlign: 'center', marginBottom: 20 }}>
              {modalAvisoContenido.mensaje}
            </Text>

            <Pressable
              onPress={() => setModalAvisoVisible(false)}
              style={({ hovered }: any) => ({
                backgroundColor: hovered ? THEME.marca800 : THEME.marca700,
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.white }}>
                Entendido
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL DE EDICIÓN DE VACANCIA / SIMO DE UNA PLAZA
      ========================================================= */}
      <Modal
        visible={modalEditarPlazaVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalEditarPlazaVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.white,
              borderRadius: 14,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: THEME.slate900 }}>
                  Actualizar Datos de Plaza #{plazaEnEdicion?.id_plaza}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.slate500 }}>
                  {plazaEnEdicion?.cargo} ({plazaEnEdicion?.dependencia_cargo})
                </Text>
              </View>
              <Pressable onPress={() => setModalEditarPlazaVisible(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {/* Código OPEC */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700, marginBottom: 4 }}>
                  Código OPEC SIMO
                </Text>
                <TextInput
                  value={editOpec}
                  onChangeText={setEditOpec}
                  placeholder="Ej: 220280"
                  style={{ height: 40, borderWidth: 1, borderColor: THEME.slate300, borderRadius: 6, paddingHorizontal: 10, fontSize: 13 }}
                />
              </View>

              {/* Fecha Vacancia */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700, marginBottom: 4 }}>
                  Fecha en que se produjo la Vacancia Definitiva (AAAA-MM-DD)
                </Text>
                <TextInput
                  value={editFechaVacancia}
                  onChangeText={setEditFechaVacancia}
                  placeholder="YYYY-MM-DD"
                  style={{ height: 40, borderWidth: 1, borderColor: THEME.slate300, borderRadius: 6, paddingHorizontal: 10, fontSize: 13 }}
                />
              </View>

              {/* Fecha Reporte SIMO */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700, marginBottom: 4 }}>
                  Fecha de Reporte a SIMO (AAAA-MM-DD)
                </Text>
                <TextInput
                  value={editFechaReporteSimo}
                  onChangeText={setEditFechaReporteSimo}
                  placeholder="YYYY-MM-DD"
                  style={{ height: 40, borderWidth: 1, borderColor: THEME.slate300, borderRadius: 6, paddingHorizontal: 10, fontSize: 13 }}
                />
              </View>

              {/* Convocatoria / Proceso de Selección */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700, marginBottom: 4 }}>
                  Proceso de Selección / Convocatoria SIMO
                </Text>
                <TextInput
                  value={editProcesoSeleccion}
                  onChangeText={setEditProcesoSeleccion}
                  placeholder="Ej: Proceso de Selección Distrito Capital 5"
                  style={{ height: 40, borderWidth: 1, borderColor: THEME.slate300, borderRadius: 6, paddingHorizontal: 10, fontSize: 13 }}
                />
              </View>

              {/* Notas de la petición */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate700, marginBottom: 4 }}>
                  Notas de Petición / Observaciones del Empleo
                </Text>
                <TextInput
                  value={editNotas}
                  onChangeText={setEditNotas}
                  multiline
                  numberOfLines={3}
                  placeholder="Observaciones de soporte..."
                  style={{ height: 60, borderWidth: 1, borderColor: THEME.slate300, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => setModalEditarPlazaVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 8,
                  backgroundColor: THEME.slate100,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate700 }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={guardarEdicionPlaza}
                disabled={guardandoPlaza}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 8,
                  backgroundColor: THEME.primary,
                  alignItems: 'center',
                }}
              >
                {guardandoPlaza ? (
                  <ActivityIndicator color={THEME.white} size="small" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.white }}>Guardar Cambios</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
