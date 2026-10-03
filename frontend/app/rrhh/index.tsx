import React, { useState } from 'react';
import {
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

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
      id: 'desvinculaciones',
      titulo: 'Desvinculaciones y Paz y Salvo',
      subtitulo: 'Procesos de Retiro y Cierre de Ciclo Laboral',
      icono: 'exit-outline' as const,
      colorIcono: '#A78BFA',
      fondoIcono: 'rgba(167, 139, 250, 0.16)',
      badge: 'EN PREPARACIÓN',
      badgeColor: '#7C3AED',
      descripcion:
        'Circuito integral de paz y salvos administrativos (sistemas, almacén, talento humano), entrega formal de puesto, actas de retiro y liquidaciones.',
      tags: ['Paz y Salvo Digital', 'Entrega de Puesto', 'Liquidación'],
      ruta: '/rrhh/desvinculaciones',
      activo: false,
      detalles: [
        'Firma y validación electrónica de paz y salvo por cada área responsable.',
        'Acta formal de entrega de inventarios, equipos de cómputo y archivo de gestión.',
        'Notificación oportuna a nómina para la liquidación definitiva de prestaciones sociales.',
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
      </LinearGradient>
    </ImageBackground>
  );
}
