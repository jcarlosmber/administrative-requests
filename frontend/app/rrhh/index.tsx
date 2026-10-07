import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
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
import { LinearGradient } from 'expo-linear-gradient';
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
  ];

  return (
    <ImageBackground
      source={require('../../assets/sjd_hero.png')}
      style={{ flex: 1, width: '100%', height: '100%' }}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(10, 24, 34, 0.92)', 'rgba(6, 16, 23, 0.97)']}
        style={{ flex: 1 }}
      >
        <StatusBar style="light" />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 40 : 18,
              paddingTop: Platform.OS === 'ios' ? 20 : 16,
              paddingBottom: 40,
              minHeight: '100%',
              justifyContent: 'space-between',
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* ====================================================
                BARRA SUPERIOR DE NAVEGACIÓN
               ==================================================== */}
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingBottom: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Pressable
                  onPress={() => router.replace('/')}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 10,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                  })}
                  accessibilityRole="button"
                >
                  <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    {isDesktop ? 'Volver al Portal Principal' : 'Volver'}
                  </Text>
                </Pressable>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable
                    onPress={() => router.push('/dashboard')}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: pressed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                    })}
                  >
                    <Ionicons name="home-outline" size={16} color="#CBD5E1" />
                    <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '600' }}>
                      Servicios Generales
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setModalDevopsVisible(true)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: pressed ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(56, 189, 248, 0.35)',
                    })}
                  >
                    <Ionicons name="terminal" size={16} color="#38BDF8" />
                    <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '700' }}>
                      bash • root@10.54.80.209:~/backend
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.replace('/login')}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: pressed ? 'rgba(190, 31, 45, 0.3)' : 'rgba(190, 31, 45, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(190, 31, 45, 0.35)',
                    })}
                  >
                    <Ionicons name="person-circle-outline" size={16} color="#F87171" />
                    <Text style={{ color: '#FCA5A5', fontSize: 13, fontWeight: '700' }}>
                      Iniciar Sesión
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* ====================================================
                  CABECERA INSTITUCIONAL RRHH (ESTILO LOGIN)
                 ==================================================== */}
              <View
                style={{
                  alignItems: 'center',
                  marginTop: isDesktop ? 34 : 22,
                  marginBottom: isDesktop ? 36 : 24,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: isDesktop ? 36 : 28,
                      fontWeight: '900',
                      color: '#FFFFFF',
                      letterSpacing: 2,
                    }}
                  >
                    SASGE
                  </Text>
                  <View
                    style={{
                      backgroundColor: COLORS.primary,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>
                      RRHH
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: '#CBD5E1',
                    fontSize: isDesktop ? 18 : 15,
                    fontWeight: '800',
                    letterSpacing: 1.2,
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    maxWidth: 700,
                  }}
                >
                  Gestión Estratégica del Talento Humano
                </Text>
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: isDesktop ? 14 : 13,
                    textAlign: 'center',
                    marginTop: 6,
                    maxWidth: 620,
                    lineHeight: 20,
                  }}
                >
                  Seleccione el proceso institucional que desea tramitar o consultar. Módulos integrados con la Secretaría Jurídica Distrital.
                </Text>
              </View>

              {/* ====================================================
                  CUADRÍCULA DE LOS 4 MÓDULOS PRINCIPALES
                 ==================================================== */}
              <View
                style={{
                  flexDirection: isDesktop ? 'row' : 'column',
                  flexWrap: isDesktop ? 'wrap' : 'nowrap',
                  gap: 20,
                  justifyContent: 'center',
                  alignItems: 'stretch',
                  maxWidth: 1240,
                  width: '100%',
                  alignSelf: 'center',
                }}
              >
                {modulos.map((item) => {
                  return (
                    <View
                      key={item.id}
                      style={{
                        width: isDesktop ? '48.5%' : '100%',
                        backgroundColor: COLORS.bgCardDarkSoft,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: item.activo
                          ? item.id === 'nomina'
                            ? 'rgba(16, 185, 129, 0.5)'
                            : 'rgba(190, 31, 45, 0.45)'
                          : COLORS.borderDark,
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 16,
                        elevation: 5,
                      }}
                    >
                      {/* Cabecera de la tarjeta */}
                      <View>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 16,
                          }}
                        >
                          <View
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 14,
                              backgroundColor: item.fondoIcono,
                              borderWidth: 1,
                              borderColor: 'rgba(255, 255, 255, 0.1)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons
                              name={item.icono}
                              size={28}
                              color={item.colorIcono}
                            />
                          </View>

                          <View
                            style={{
                              backgroundColor: item.activo
                                ? 'rgba(190, 31, 45, 0.25)'
                                : 'rgba(255, 255, 255, 0.1)',
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 20,
                              borderWidth: 1,
                              borderColor: item.activo
                                ? COLORS.primary
                                : 'rgba(255, 255, 255, 0.2)',
                            }}
                          >
                            <Text
                              style={{
                                color: item.activo ? '#FFA4AC' : '#CBD5E1',
                                fontSize: 10,
                                fontWeight: '800',
                                letterSpacing: 0.8,
                              }}
                            >
                              {item.badge}
                            </Text>
                          </View>
                        </View>

                        {/* Título y Subtítulo */}
                        <Text
                          style={{
                            color: COLORS.white,
                            fontSize: 18,
                            fontWeight: '800',
                            marginBottom: 4,
                            lineHeight: 24,
                          }}
                        >
                          {item.titulo}
                        </Text>
                        <Text
                          style={{
                            color: '#93C5FD',
                            fontSize: 12,
                            fontWeight: '600',
                            marginBottom: 12,
                          }}
                        >
                          {item.subtitulo}
                        </Text>

                        {/* Descripción */}
                        <Text
                          style={{
                            color: '#CBD5E1',
                            fontSize: 13,
                            lineHeight: 19,
                            marginBottom: 16,
                          }}
                        >
                          {item.descripcion}
                        </Text>

                        {/* Etiquetas o Tags */}
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 6,
                            marginBottom: 20,
                          }}
                        >
                          {item.tags.map((tag, idx) => (
                            <View
                              key={idx}
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.08)',
                              }}
                            >
                              <Text
                                style={{
                                  color: '#94A3B8',
                                  fontSize: 11,
                                  fontWeight: '600',
                                }}
                              >
                                {tag}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Botones de acción */}
                      <View style={{ gap: 10 }}>
                        <Pressable
                          onPress={() => {
                            if (item.ruta) {
                              router.push(item.ruta as any);
                            }
                          }}
                          style={({ pressed }) => ({
                            minHeight: 46,
                            borderRadius: 12,
                            backgroundColor: item.activo
                              ? pressed
                                ? (item.id === 'nomina' ? '#059669' : COLORS.primaryHover)
                                : (item.id === 'nomina' ? '#10B981' : COLORS.primary)
                              : pressed
                              ? '#1E3A5F'
                              : '#1E293B',
                            borderWidth: 1,
                            borderColor: item.activo
                              ? (item.id === 'nomina' ? '#10B981' : COLORS.primary)
                              : 'rgba(255, 255, 255, 0.15)',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 8,
                            paddingHorizontal: 16,
                            shadowColor: item.activo ? (item.id === 'nomina' ? '#10B981' : COLORS.primary) : '#000',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: item.activo ? 0.35 : 0.15,
                            shadowRadius: 8,
                            elevation: 3,
                          })}
                          accessibilityRole="button"
                        >
                          <Ionicons
                            name={item.activo ? 'arrow-forward-circle' : 'open-outline'}
                            size={18}
                            color="#FFFFFF"
                          />
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 14,
                              fontWeight: '800',
                            }}
                          >
                            {item.activo ? 'Ingresar a Validación' : 'Abrir Módulo'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => abrirInfoModulo(item)}
                          style={({ pressed }) => ({
                            minHeight: 38,
                            borderRadius: 10,
                            backgroundColor: pressed
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'transparent',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 6,
                          })}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={16}
                            color="#94A3B8"
                          />
                          <Text
                            style={{
                              color: '#94A3B8',
                              fontSize: 12,
                              fontWeight: '600',
                            }}
                          >
                            Ver alcances y detalles
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ====================================================
                PIE DE PÁGINA INSTITUCIONAL (LOGO SJD)
               ==================================================== */}
            <View
              style={{
                alignItems: 'center',
                paddingTop: 36,
                marginTop: 20,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <Image
                source={require('../../assets/logos/sjd blanco amarillo.png')}
                style={{
                  width: isDesktop ? 220 : 170,
                  height: isDesktop ? 50 : 38,
                  opacity: 0.9,
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  color: '#64748B',
                  fontSize: 11,
                  marginTop: 10,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
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
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: '#0F2133',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                padding: 24,
                width: '100%',
                maxWidth: 520,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
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
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: 'rgba(190, 31, 45, 0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="information-circle" size={22} color="#F87171" />
                  </View>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '800',
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
                  color: '#CBD5E1',
                  fontSize: 13,
                  lineHeight: 19,
                  marginBottom: 16,
                }}
              >
                {modalInfo?.descripcion}
              </Text>

              <Text
                style={{
                  color: '#93C5FD',
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
                      color="#10B981"
                      style={{ marginTop: 2 }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        color: '#E2E8F0',
                        fontSize: 12.5,
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
                    borderRadius: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '700' }}>
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
                      borderRadius: 10,
                      backgroundColor: COLORS.primary,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      Ir al Módulo
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
      </LinearGradient>
    </ImageBackground>
  );
}
