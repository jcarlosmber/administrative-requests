import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { settingsService } from '../../lib/settingsService';

const COLORS = {
  primary: '#BE1F2D', // Rojo BOGOTÁ
  primaryHover: '#9B1623',
  bgDark: '#0D1E2B',
  bgCardDark: '#16354A',
  bgCardDarkSoft: '#1D435C',
  borderDark: 'rgba(255, 255, 255, 0.15)',
  white: '#FFFFFF',
  textMuted: '#94A3B8',
  textLight: '#E2E8F0',
  blueBadge: '#0284C7',
  purpleBadge: '#7C3AED',
  greenBadge: '#10B981',
};

export default function ModulosRRHHPagina() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 768 && width < 992;

  // Estado para Modal de información de módulo (Regla: Usar modals en vez de alerts)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInfo, setModalInfo] = useState<{
    titulo: string;
    subtitulo: string;
    descripcion: string;
    detalles: string[];
    ruta?: string;
  } | null>(null);

  const abrirInfoModulo = (modulo: {
    titulo: string;
    subtitulo: string;
    descripcion: string;
    detalles: string[];
    ruta?: string;
  }) => {
    setModalInfo(modulo);
    setModalVisible(true);
  };

  // ==============================================================
  // ESTADOS Y ACCIONES PARA MODAL SERVIDOR / DEVOPS (10.54.80.209)
  // ==============================================================
  const [modalDevopsVisible, setModalDevopsVisible] = useState(false);
  const [devopsExecuting, setDevopsExecuting] = useState(false);
  const [devopsActionRunning, setDevopsActionRunning] = useState<string | null>(null);
  const [terminalCommand, setTerminalCommand] = useState('');
  const [mostrarLoginDevops, setMostrarLoginDevops] = useState(false);
  const [devopsEmail, setDevopsEmail] = useState('');
  const [devopsPassword, setDevopsPassword] = useState('');
  const [devopsAuthLoading, setDevopsAuthLoading] = useState(false);
  const [devopsAuthError, setDevopsAuthError] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<Array<{
    tipo: 'cmd' | 'stdout' | 'stderr' | 'info' | 'success' | 'error';
    texto: string;
    timestamp: string;
  }>>([
    {
      tipo: 'info',
      texto: 'SASGE Terminal Engine conectado (servidor 10.54.80.209).\nTerminal lista para operaciones autorizadas en root@10.54.80.209:~/backend',
      timestamp: new Date().toLocaleTimeString('es-CO')
    }
  ]);

  const agregarLogTerminal = (tipo: 'cmd' | 'stdout' | 'stderr' | 'info' | 'success' | 'error', texto: string) => {
    setTerminalLogs(prev => [
      ...prev,
      { tipo, texto, timestamp: new Date().toLocaleTimeString('es-CO') }
    ]);
  };

  const handleLoginDevops = async () => {
    if (!devopsEmail.trim() || !devopsPassword.trim()) {
      setDevopsAuthError('Ingresa tu usuario/correo y contraseña.');
      return;
    }
    try {
      setDevopsAuthLoading(true);
      setDevopsAuthError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: devopsEmail.trim(),
        password: devopsPassword.trim()
      });
      if (error) {
        throw error;
      }
      const user = data.user;
      const role = user?.role || 'usuario';
      agregarLogTerminal('success', `✓ Autenticación exitosa como ${user?.email || devopsEmail}. Rol: ${role}.`);
      if (role !== 'superadmin') {
        agregarLogTerminal('error', '⚠ Advertencia: Tu cuenta no tiene rol de Super Administrador. Las operaciones de servidor requieren privilegios de superadmin.');
      } else {
        agregarLogTerminal('info', '✓ Privilegios de Super Administrador confirmados. Token de sesión renovado por 7 días.');
      }
      setMostrarLoginDevops(false);
      setDevopsPassword('');
    } catch (err: any) {
      setDevopsAuthError(err.message || 'Error de credenciales.');
      agregarLogTerminal('error', `✗ Error de autenticación: ${err.message || 'Credenciales no válidas.'}`);
    } finally {
      setDevopsAuthLoading(false);
    }
  };

  const ejecutarOperacionDevops = async (action: 'pull' | 'build_front' | 'restart_backend' | 'status') => {
    const nombres: Record<string, string> = {
      pull: 'git pull origin main',
      build_front: 'npx expo export (Build Frontend)',
      restart_backend: 'pm2 restart all (Reinicio Backend)',
      status: 'git status -s && git log -1'
    };
    const cmdNombre = nombres[action] || action;
    agregarLogTerminal('cmd', `$ ${cmdNombre}`);
    agregarLogTerminal('info', 'Ejecutando en servidor de producción (10.54.80.209)...');
    try {
      setDevopsExecuting(true);
      setDevopsActionRunning(action);
      const res = await settingsService.executeGitOperation(action);
      if (res.output) {
        agregarLogTerminal('stdout', res.output);
      }
      agregarLogTerminal('success', `✓ ${res.message || 'Operación completada exitosamente.'}`);
    } catch (err: any) {
      const msg = err.message || 'Fallo de conexión o permisos insuficientes.';
      agregarLogTerminal('error', `✗ Error: ${msg}`);
      if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('expirado') || msg.toLowerCase().includes('sesión') || msg.toLowerCase().includes('super administrador')) {
        agregarLogTerminal('info', '🔑 Tu token JWT ha expirado o no estás autenticado. Haz clic en "Renovar Sesión" para ingresar tus credenciales.');
        setMostrarLoginDevops(true);
      }
    } finally {
      setDevopsExecuting(false);
      setDevopsActionRunning(null);
    }
  };

  const ejecutarComandoTerminal = async (comandoCustom?: string) => {
    const cmd = (comandoCustom || terminalCommand).trim();
    if (!cmd) return;
    agregarLogTerminal('cmd', `$ ${cmd}`);
    try {
      setDevopsExecuting(true);
      setDevopsActionRunning('cmd');
      const res = await settingsService.executeTerminalCommand(cmd);
      if (res.output) {
        agregarLogTerminal('stdout', res.output);
      }
      agregarLogTerminal('success', `✓ ${res.message || 'Comando finalizado.'}`);
      setTerminalCommand('');
    } catch (err: any) {
      const msg = err.message || 'Error al ejecutar comando.';
      agregarLogTerminal('error', `✗ ${msg}`);
      if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('expirado') || msg.toLowerCase().includes('sesión') || msg.toLowerCase().includes('super administrador')) {
        agregarLogTerminal('info', '🔑 Tu sesión de administrador ha caducado. Ingresa tus credenciales en el formulario de arriba.');
        setMostrarLoginDevops(true);
      }
    } finally {
      setDevopsExecuting(false);
      setDevopsActionRunning(null);
    }
  };

  const copiarLogsTerminal = () => {
    const todo = terminalLogs.map(l => `[${l.timestamp}] ${l.texto}`).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(todo);
      agregarLogTerminal('info', 'ℹ Registro de la terminal copiado al portapapeles.');
    }
  };

  const limpiarLogsTerminal = () => {
    setTerminalLogs([
      {
        tipo: 'info',
        texto: 'Terminal reiniciada. Servidor: root@10.54.80.209:~/backend',
        timestamp: new Date().toLocaleTimeString('es-CO')
      }
    ]);
  };

  const modulos = [
    {
      id: 'ingresos',
      titulo: 'Validación Técnica de Ingresos',
      subtitulo: 'Cotejo Documental con Inteligencia Artificial',
      icono: 'shield-checkmark' as const,
      colorIcono: COLORS.primary,
      fondoIcono: 'rgba(190, 31, 45, 0.18)',
      badge: 'ACTIVO • IA GEMINI',
      badgeColor: COLORS.primary,
      descripcion:
        'Cotejo de hojas de vida, verificación formal de títulos y tarjetas profesionales, y dictamen de experiencia laboral frente al Manual de Funciones.',
      tags: ['Manual de Funciones', 'Cotejo IA', 'Actas de Dictamen'],
      ruta: '/ingresos',
      activo: true,
      detalles: [
        'Análisis automatizado de experiencia laboral y formación académica con Gemini 2.5 Pro.',
        'Verificación de equivalencias de estudio y experiencia según normatividad vigente.',
        'Registro de candidatos de planta y generación de reportes oficiales en Excel y PDF.',
      ],
    },
    {
      id: 'teletrabajo',
      titulo: 'Gestión de Teletrabajo',
      subtitulo: 'Acuerdos, Modalidad Híbrida y Seguimiento',
      icono: 'laptop-outline' as const,
      colorIcono: '#38BDF8',
      fondoIcono: 'rgba(56, 189, 248, 0.16)',
      badge: 'EN PREPARACIÓN',
      badgeColor: '#0284C7',
      descripcion:
        'Administración y suscripción de acuerdos de teletrabajo institucional, concertación de entregables, reporte de jornadas y seguimiento de modalidad remota.',
      tags: ['Acuerdos Laborales', 'Jornadas Híbridas', 'Evidencias'],
      ruta: '/rrhh/teletrabajo',
      activo: false,
      detalles: [
        'Postulación y validación de requisitos de puesto de trabajo en casa.',
        'Concertación de objetivos mensuales y matriz de compromisos entre jefe y servidor.',
        'Trazabilidad en tiempo real de los días presenciales y de teletrabajo de la entidad.',
      ],
    },
    {
      id: 'vinculaciones_desvinculaciones',
      titulo: 'Vinculaciones y Desvinculaciones',
      subtitulo: 'Procedimientos PR-145 y PR-137 • Retiro y Paz y Salvo',
      icono: 'people-outline' as const,
      colorIcono: '#A78BFA',
      fondoIcono: 'rgba(167, 139, 250, 0.16)',
      badge: 'ACTIVO • PR-145 / PR-137',
      badgeColor: '#7C3AED',
      descripcion:
        'Procedimientos integrales de vinculación de servidores (PR-145) y practicantes/judicantes (PR-137), verificación de contratos activos en SECOP II, validación técnica de ingresos (IA) y circuito de desvinculación con paz y salvo.',
      tags: ['Vinculación PR-145', 'Practicantes PR-137', 'Consulta SECOP II', 'Validación Ingresos', 'Paz y Salvo Digital'],
      ruta: '/rrhh/vinculaciones-desvinculaciones',
      activo: true,
      detalles: [
        'Verificación de antecedentes, inhabilidades y consulta de contratos en tiempo real con SECOP II.',
        'Articulación directa con Validación Técnica de Ingresos (IA Gemini) y Formato FT-318.',
        'Circuito integral de paz y salvos administrativos (sistemas, almacén, talento humano), entrega formal de puesto y liquidaciones.',
      ],
    },
    {
      id: 'nomina',
      titulo: 'Gestión de Planta y Nómina',
      subtitulo: 'Plazas, Asignación de Cargos y Personal',
      icono: 'briefcase' as const,
      colorIcono: '#10B981',
      fondoIcono: 'rgba(16, 185, 129, 0.18)',
      badge: 'NUEVO • ACTIVO',
      badgeColor: '#059669',
      descripcion:
        'Control integral de las 170 plazas de la entidad, seguimiento de cargos (ocupados, vacantes y encargos) y alimentación masiva mediante archivos de Planta y Planta Perno.',
      tags: ['Planta de Personal', 'Plazas y Cargos', 'Nómina Perno', 'Carga Masiva'],
      ruta: '/rrhh/nomina',
      activo: true,
      detalles: [
        'Visualización y búsqueda en tiempo real de plazas oficiales y servidores asignados.',
        'Control de vacancias definitivas, temporales y situaciones administrativas.',
        'Módulo de alimentación y actualización por carga de archivos de Planta y Planta Perno.',
      ],
    },
    {
      id: 'peticiones_opec',
      titulo: 'Derechos de Petición OPEC',
      subtitulo: 'Asistente de Empleos Equivalentes y Planta',
      icono: 'scale' as const,
      colorIcono: '#BE1F2D',
      fondoIcono: 'rgba(190, 31, 45, 0.15)',
      badge: 'NUEVO • IA',
      badgeColor: '#BE1F2D',
      descripcion:
        'Respuesta automática e instantánea a peticiones de aspirantes y CNSC: literales (a-i), empleos equivalentes, vacancias definitivas y borrador de oficio formal.',
      tags: ['OPEC SIMO', 'Derechos de Petición', 'Vacancias Definitivas', 'Oficio Formal'],
      ruta: '/rrhh/peticiones-opec',
      activo: true,
      detalles: [
        'Cálculo automático de los literales a) al i) a partir del número de OPEC.',
        'Identificación instantánea de empleos iguales o equivalentes en la planta global.',
        'Generador de oficio de respuesta formal institucional listo para copiar.',
        'Exportación de la matriz técnica a Excel con un solo clic.',
      ],
    },
  ];

  // Colores de cada módulo sobre fondo claro (misma paleta de la app de contratos)
  const ESTILO_MODULO: Record<string, { color: string; fondo: string }> = {
    ingresos: { color: '#BE1F2D', fondo: '#FDECEE' },
    teletrabajo: { color: '#0369A1', fondo: '#E0F2FE' },
    vinculaciones_desvinculaciones: { color: '#6D28D9', fondo: '#EDE9FE' },
    nomina: { color: '#047857', fondo: '#D1FAE5' },
    peticiones_opec: { color: '#BE1F2D', fondo: '#FDECEE' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <StatusBar style="dark" />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 32 : 16,
              paddingTop: isDesktop ? 32 : 18,
              paddingBottom: 40,
              maxWidth: 1280,
              width: '100%',
              alignSelf: 'center',
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* ====================================================
                ENCABEZADO DE LA PÁGINA (ESTILO APP DE CONTRATOS)
               ==================================================== */}
            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                alignItems: isDesktop ? 'flex-end' : 'flex-start',
                justifyContent: 'space-between',
                gap: 14,
                marginBottom: 24,
              }}
            >
              <View style={{ flexShrink: 1 }}>
                {!isDesktop && (
                  <Pressable
                    onPress={() => router.replace('/')}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}
                    accessibilityRole="button"
                  >
                    <Ionicons name="arrow-back" size={16} color="#1F5A96" />
                    <Text style={{ color: '#1F5A96', fontSize: 13, fontWeight: '600' }}>Volver al portal</Text>
                  </Pressable>
                )}
                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  Secretaría Jurídica Distrital · Dirección de Talento Humano
                </Text>
                <Text style={{ color: '#0F172A', fontSize: isDesktop ? 26 : 22, fontWeight: '700', marginTop: 4 }}>
                  Gestión Estratégica del Talento Humano
                </Text>
                <Text style={{ color: '#64748B', fontSize: 14, marginTop: 6, lineHeight: 20, maxWidth: 720 }}>
                  Seleccione el proceso institucional que desea tramitar o consultar.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={() => setModalDevopsVisible(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                    borderWidth: 1, borderColor: '#E2E8F0',
                    backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF',
                  })}
                >
                  <Ionicons name="terminal-outline" size={15} color="#334155" />
                  <Text style={{ color: '#334155', fontSize: 12.5, fontWeight: '600' }}>Servidor</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.replace('/login')}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                    borderWidth: 1, borderColor: '#E2E8F0',
                    backgroundColor: pressed ? '#F1F5F9' : '#FFFFFF',
                  })}
                >
                  <Ionicons name="person-circle-outline" size={15} color="#334155" />
                  <Text style={{ color: '#334155', fontSize: 12.5, fontWeight: '600' }}>Iniciar sesión</Text>
                </Pressable>
              </View>
            </View>

            {/* ====================================================
                TARJETAS DE LOS 4 MÓDULOS
               ==================================================== */}
            <View
              style={{
                flexDirection: isDesktop || isTablet ? 'row' : 'column',
                flexWrap: 'wrap',
                gap: 20,
              }}
            >
              {modulos.map((item) => {
                const estilo = ESTILO_MODULO[item.id] ?? { color: '#1F5A96', fondo: '#EEF4FB' };
                return (
                  <View
                    key={item.id}
                    style={{
                      width: isDesktop || isTablet ? '48.8%' : '100%',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 22,
                      justifyContent: 'space-between',
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <View
                          style={{
                            width: 44, height: 44, borderRadius: 10,
                            backgroundColor: estilo.fondo,
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Ionicons name={item.icono} size={22} color={estilo.color} />
                        </View>
                        <View
                          style={{
                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
                            backgroundColor: item.activo ? '#ECFDF5' : '#F1F5F9',
                            borderColor: item.activo ? '#A7F3D0' : '#E2E8F0',
                          }}
                        >
                          <Text style={{ color: item.activo ? '#047857' : '#475569', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4 }}>
                            {item.badge}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ color: '#0F172A', fontSize: 17, fontWeight: '700', lineHeight: 23 }}>{item.titulo}</Text>
                      <Text style={{ color: '#1F5A96', fontSize: 12.5, fontWeight: '600', marginTop: 2, marginBottom: 10 }}>{item.subtitulo}</Text>
                      <Text style={{ color: '#475569', fontSize: 13.5, lineHeight: 20, marginBottom: 14 }}>{item.descripcion}</Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                        {item.tags.map((tag, idx) => (
                          <View key={idx} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                            <Text style={{ color: '#475569', fontSize: 11.5, fontWeight: '500' }}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 }}>
                      <Pressable
                        onPress={() => abrirInfoModulo(item)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                      >
                        <Ionicons name="information-circle-outline" size={15} color="#64748B" />
                        <Text style={{ color: '#64748B', fontSize: 12.5, fontWeight: '500' }}>Ver alcances y detalles</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { if (item.ruta) router.push(item.ruta as any); }}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                          backgroundColor: pressed ? '#123A63' : '#174A7E',
                        })}
                        accessibilityRole="button"
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Abrir módulo</Text>
                        <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ====================================================
                PIE DE PÁGINA INSTITUCIONAL (LOGO SJD)
               ==================================================== */}
            <View style={{ alignItems: 'center', paddingTop: 28, marginTop: 32, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
              <Image
                source={require('../../assets/logos/SJD color.png')}
                style={{ width: isDesktop ? 190 : 150, height: isDesktop ? 44 : 34 }}
                resizeMode="contain"
              />
              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                Alcaldía Mayor de Bogotá • Secretaría Jurídica Distrital • Dirección de Talento Humano
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* ====================================================
            MODAL DE DETALLES INSTITUCIONAL (REGLA: NO ALERTS)
           ==================================================== */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 24,
                width: '100%',
                maxWidth: 520,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
                elevation: 10,
              }}
            >
              {/* Header Modal */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: '#EEF4FB',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="information-circle" size={22} color="#1F5A96" />
                  </View>
                  <Text
                    style={{
                      color: '#0F172A',
                      fontSize: 16,
                      fontWeight: '700',
                      maxWidth: 360,
                    }}
                  >
                    {modalInfo?.titulo}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </Pressable>
              </View>

              {/* Contenido Modal */}
              <Text
                style={{
                  color: '#475569',
                  fontSize: 13.5,
                  lineHeight: 20,
                  marginBottom: 16,
                }}
              >
                {modalInfo?.descripcion}
              </Text>

              <Text
                style={{
                  color: '#1F5A96',
                  fontSize: 12,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 8,
                }}
              >
                Aspectos clave del proceso:
              </Text>

              <View style={{ gap: 8, marginBottom: 22 }}>
                {modalInfo?.detalles.map((d, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#047857"
                      style={{ marginTop: 2 }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        color: '#334155',
                        fontSize: 13,
                        lineHeight: 18,
                      }}
                    >
                      {d}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Botones de acción modal */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  justifyContent: 'flex-end',
                }}
              >
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: '#F1F5F9',
                  }}
                >
                  <Text style={{ color: '#334155', fontSize: 13, fontWeight: '600' }}>
                    Cerrar
                  </Text>
                </Pressable>

                {modalInfo?.ruta && (
                  <Pressable
                    onPress={() => {
                      const r = modalInfo.ruta;
                      setModalVisible(false);
                      if (r) router.push(r as any);
                    }}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: '#174A7E',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                      Ir al módulo
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* ==============================================================
            MODAL DEVOPS & TERMINAL BASH (root@10.54.80.209:~/backend)
           ============================================================== */}
        <Modal
          visible={modalDevopsVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalDevopsVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(2, 6, 23, 0.82)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#0B0F19',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#1E293B',
                width: '100%',
                maxWidth: 820,
                maxHeight: '92%',
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.5,
                shadowRadius: 20,
                elevation: 12,
              }}
            >
              {/* Barra Superior estilo Terminal Unix */}
              <View
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#1E293B',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* Semáforo Unix */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity onPress={() => setModalDevopsVisible(false)} activeOpacity={0.7}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={limpiarLogsTerminal} activeOpacity={0.7}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B' }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => ejecutarOperacionDevops('status')} activeOpacity={0.7}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981' }} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="terminal" size={16} color="#38BDF8" />
                    <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '800', fontFamily: 'monospace' }}>
                      bash • root@10.54.80.209:~/backend
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setMostrarLoginDevops(!mostrarLoginDevops)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: mostrarLoginDevops ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      borderColor: mostrarLoginDevops ? '#38BDF8' : 'rgba(255, 255, 255, 0.15)',
                      borderWidth: 1,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Ionicons name="key-outline" size={12} color={mostrarLoginDevops ? '#38BDF8' : '#94A3B8'} />
                    <Text style={{ color: mostrarLoginDevops ? '#38BDF8' : '#CBD5E1', fontSize: 10.5, fontWeight: '700' }}>
                      {mostrarLoginDevops ? 'Ocultar Auth' : 'Renovar Sesión'}
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: 'rgba(16, 185, 129, 0.14)',
                      borderColor: 'rgba(16, 185, 129, 0.35)',
                      borderWidth: 1,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                    <Text style={{ color: '#34D399', fontSize: 10.5, fontWeight: '800', fontFamily: 'monospace' }}>
                      PRODUCCIÓN (10.54.80.209)
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setModalDevopsVisible(false)}
                    style={{ padding: 4, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                  >
                    <Ionicons name="close" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={{ padding: 16 }} contentContainerStyle={{ gap: 16 }}>
                {/* Formulario de Inicio de Sesión / Renovación de Token si está activo */}
                {mostrarLoginDevops && (
                  <View
                    style={{
                      backgroundColor: '#0F172A',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(56, 189, 248, 0.4)',
                      padding: 14,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="shield-checkmark" size={16} color="#38BDF8" />
                        <Text style={{ color: '#F8FAFC', fontSize: 13, fontWeight: '800' }}>
                          Autenticación de Super Administrador (10.54.80.209)
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setMostrarLoginDevops(false)}>
                        <Ionicons name="close-circle-outline" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>

                    <Text style={{ color: '#94A3B8', fontSize: 11.5, lineHeight: 16 }}>
                      Ingresa tus credenciales del sistema o Directorio Activo para renovar el token JWT y autorizar comandos de servidor:
                    </Text>

                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                      <TextInput
                        value={devopsEmail}
                        onChangeText={setDevopsEmail}
                        placeholder="Usuario o correo institucional"
                        placeholderTextColor="#475569"
                        autoCapitalize="none"
                        style={{
                          flex: 1,
                          backgroundColor: '#1E293B',
                          color: '#FFFFFF',
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 12.5,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                      />
                      <TextInput
                        value={devopsPassword}
                        onChangeText={setDevopsPassword}
                        placeholder="Contraseña"
                        placeholderTextColor="#475569"
                        secureTextEntry={true}
                        onSubmitEditing={handleLoginDevops}
                        style={{
                          flex: 1,
                          backgroundColor: '#1E293B',
                          color: '#FFFFFF',
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 12.5,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                      />
                      <TouchableOpacity
                        onPress={handleLoginDevops}
                        disabled={devopsAuthLoading}
                        style={{
                          backgroundColor: '#0284C7',
                          borderRadius: 8,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        {devopsAuthLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="log-in-outline" size={15} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>Autenticar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {devopsAuthError && (
                      <Text style={{ color: '#F87171', fontSize: 11.5 }}>
                        ✗ {devopsAuthError}
                      </Text>
                    )}
                  </View>
                )}

                {/* ====================================================
                    ACCIONES RÁPIDAS SOLICITADAS
                   ==================================================== */}
                <View>
                  <Text
                    style={{
                      color: '#94A3B8',
                      fontSize: 11,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginBottom: 10,
                    }}
                  >
                    Acciones de Despliegue y Control de Versiones
                  </Text>

                  <View
                    style={{
                      flexDirection: isDesktop ? 'row' : 'column',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    {/* Botón 1: Git Pull */}
                    <TouchableOpacity
                      onPress={() => ejecutarOperacionDevops('pull')}
                      disabled={devopsExecuting}
                      activeOpacity={0.8}
                      style={{
                        flex: isDesktop ? 1 : undefined,
                        minWidth: 170,
                        backgroundColor: '#1E293B',
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: devopsActionRunning === 'pull' ? '#38BDF8' : 'rgba(56, 189, 248, 0.25)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                        {devopsActionRunning === 'pull' ? (
                          <ActivityIndicator size="small" color="#38BDF8" />
                        ) : (
                          <Ionicons name="cloud-download-outline" size={18} color="#38BDF8" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '700' }}>Hacer Git Pull</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 10.5 }}>git pull origin main</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Botón 2: Build Front */}
                    <TouchableOpacity
                      onPress={() => ejecutarOperacionDevops('build_front')}
                      disabled={devopsExecuting}
                      activeOpacity={0.8}
                      style={{
                        flex: isDesktop ? 1 : undefined,
                        minWidth: 170,
                        backgroundColor: '#1E293B',
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: devopsActionRunning === 'build_front' ? '#10B981' : 'rgba(16, 185, 129, 0.25)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                        {devopsActionRunning === 'build_front' ? (
                          <ActivityIndicator size="small" color="#10B981" />
                        ) : (
                          <Ionicons name="cube-outline" size={18} color="#10B981" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '700' }}>Build Front</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 10.5 }}>npx expo export (Web)</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Botón 3: Reiniciar Backend */}
                    <TouchableOpacity
                      onPress={() => ejecutarOperacionDevops('restart_backend')}
                      disabled={devopsExecuting}
                      activeOpacity={0.8}
                      style={{
                        flex: isDesktop ? 1 : undefined,
                        minWidth: 170,
                        backgroundColor: '#1E293B',
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: devopsActionRunning === 'restart_backend' ? '#F43F5E' : 'rgba(244, 63, 94, 0.25)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(244, 63, 94, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                        {devopsActionRunning === 'restart_backend' ? (
                          <ActivityIndicator size="small" color="#F43F5E" />
                        ) : (
                          <Ionicons name="reload-circle-outline" size={18} color="#F43F5E" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '700' }}>Reiniciar Backend</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 10.5 }}>pm2 restart all (PM2)</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Botón 4: Verificar Estado Git */}
                    <TouchableOpacity
                      onPress={() => ejecutarOperacionDevops('status')}
                      disabled={devopsExecuting}
                      activeOpacity={0.8}
                      style={{
                        flex: isDesktop ? 1 : undefined,
                        minWidth: 170,
                        backgroundColor: '#1E293B',
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: devopsActionRunning === 'status' ? '#A855F7' : 'rgba(168, 85, 247, 0.25)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(168, 85, 247, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                        {devopsActionRunning === 'status' ? (
                          <ActivityIndicator size="small" color="#A855F7" />
                        ) : (
                          <Ionicons name="git-branch-outline" size={18} color="#A855F7" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '700' }}>Verificar Estado Git</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 10.5 }}>git status -s && git log</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ====================================================
                    CONSOLA INTERACTIVA BASH (root@10.54.80.209:~/backend)
                   ==================================================== */}
                <View
                  style={{
                    backgroundColor: '#030712',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#1E293B',
                    overflow: 'hidden',
                  }}
                >
                  {/* Encabezado de la Terminal */}
                  <View
                    style={{
                      backgroundColor: '#0A0F1D',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: '#1E293B',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: '#38BDF8', fontSize: 11, fontFamily: 'monospace', fontWeight: '800' }}>
                        root@10.54.80.209:~/backend#
                      </Text>
                      <Text style={{ color: '#64748B', fontSize: 11, fontFamily: 'monospace' }}>
                        /bin/bash
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={copiarLogsTerminal}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.06)', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Ionicons name="copy-outline" size={12} color="#94A3B8" />
                        <Text style={{ color: '#94A3B8', fontSize: 11 }}>Copiar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={limpiarLogsTerminal}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.06)', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Ionicons name="trash-outline" size={12} color="#94A3B8" />
                        <Text style={{ color: '#94A3B8', fontSize: 11 }}>Limpiar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Salida de Logs */}
                  <ScrollView
                    style={{ height: 220, padding: 12, backgroundColor: '#020617' }}
                    nestedScrollEnabled={true}
                  >
                    {terminalLogs.map((item, idx) => {
                      let col = '#E2E8F0';
                      if (item.tipo === 'cmd') col = '#38BDF8';
                      else if (item.tipo === 'info') col = '#94A3B8';
                      else if (item.tipo === 'success') col = '#34D399';
                      else if (item.tipo === 'error') col = '#F87171';

                      return (
                        <View key={idx} style={{ marginBottom: 6 }}>
                          <Text style={{ color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>
                            [{item.timestamp}]
                          </Text>
                          <Text
                            style={{
                              color: col,
                              fontSize: 12,
                              fontFamily: 'monospace',
                              lineHeight: 18,
                              fontWeight: item.tipo === 'cmd' ? '700' : '400',
                            }}
                            selectable={true}
                          >
                            {item.texto}
                          </Text>
                        </View>
                      );
                    })}
                    {devopsExecuting && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <ActivityIndicator size="small" color="#38BDF8" />
                        <Text style={{ color: '#38BDF8', fontSize: 11, fontFamily: 'monospace' }}>
                          Procesando en el servidor de producción...
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Input de Comando Libre */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderTopWidth: 1,
                      borderTopColor: '#1E293B',
                      backgroundColor: '#090D1A',
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: '#38BDF8', fontFamily: 'monospace', fontWeight: '800', fontSize: 13 }}>
                      $
                    </Text>
                    <TextInput
                      value={terminalCommand}
                      onChangeText={setTerminalCommand}
                      placeholder="git pull origin main | pm2 restart all | git status -s"
                      placeholderTextColor="#475569"
                      onSubmitEditing={() => ejecutarComandoTerminal()}
                      editable={!devopsExecuting}
                      style={{
                        flex: 1,
                        color: '#F8FAFC',
                        fontFamily: 'monospace',
                        fontSize: 12.5,
                        paddingVertical: 4,
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => ejecutarComandoTerminal()}
                      disabled={devopsExecuting || !terminalCommand.trim()}
                      style={{
                        backgroundColor: devopsExecuting || !terminalCommand.trim() ? '#1E293B' : '#0284C7',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Ionicons name="play" size={12} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Ejecutar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Footer Modal */}
              <View
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: '#1E293B',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#64748B', fontSize: 11.5 }}>
                  Servidor Host: <Text style={{ color: '#94A3B8', fontWeight: '700' }}>10.54.80.209</Text> • Ruta: <Text style={{ color: '#94A3B8', fontWeight: '700' }}>~/backend</Text>
                </Text>

                <TouchableOpacity
                  onPress={() => setModalDevopsVisible(false)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#CBD5E1', fontSize: 12.5, fontWeight: '700' }}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
    </View>
  );
}
