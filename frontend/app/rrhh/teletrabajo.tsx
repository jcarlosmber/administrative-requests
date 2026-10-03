import React, { useState } from 'react';
import {
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
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  primary: '#BE1F2D',
  primaryHover: '#9B1623',
  darkBg: '#0B1724',
  cardBg: '#13283B',
  border: 'rgba(255, 255, 255, 0.12)',
  textLight: '#F8FAFC',
  textMuted: '#94A3B8',
  blueAccent: '#0284C7',
};

export default function TeletrabajoScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  // Estado para modal informativo (Regla: Modals en vez de alerts)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMsg, setModalMsg] = useState('');

  const mostrarModal = (titulo: string, mensaje: string) => {
    setModalTitle(titulo);
    setModalMsg(mensaje);
    setModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.darkBg }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Cabecera Superior */}
        <View
          style={{
            backgroundColor: '#0F2133',
            paddingTop: Platform.OS === 'ios' ? 16 : 14,
            paddingBottom: 16,
            paddingHorizontal: isDesktop ? 36 : 18,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable
              onPress={() => router.replace('/rrhh')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: pressed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              })}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                Módulos RRHH
              </Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: 'rgba(56, 189, 248, 0.16)',
                  borderWidth: 1,
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="laptop-outline" size={22} color="#38BDF8" />
              </View>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                  Gestión de Teletrabajo
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                  Talento Humano • Secretaría Jurídica Distrital
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => router.push('/ingresos')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: pressed ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              })}
            >
              <Ionicons name="shield-checkmark" size={16} color="#F87171" />
              <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '600' }}>
                Validación Ingresos
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: isDesktop ? 36 : 18,
            paddingVertical: 24,
            maxWidth: 1100,
            width: '100%',
            alignSelf: 'center',
            gap: 20,
          }}
        >
          {/* Banner de fase de preparación */}
          <View
            style={{
              backgroundColor: COLORS.cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(56, 189, 248, 0.25)',
              padding: 22,
              flexDirection: isDesktop ? 'row' : 'column',
              alignItems: isDesktop ? 'center' : 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <View style={{ flex: 1, gap: 6 }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#0284C7',
                }}
              >
                <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '800' }}>
                  ESPACIO PREPARADO PARA CONTENIDO
                </Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                Módulo de Teletrabajo Institucional
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, lineHeight: 19 }}>
                Esta sección está lista para integrar formularios de solicitud, verificación de condiciones ergonómicas y tecnológicas, concertación de metas y cronograma semanal de días presenciales vs remotos.
              </Text>
            </View>

            <Pressable
              onPress={() =>
                mostrarModal(
                  'Configuración de Teletrabajo',
                  'Este módulo se conectará con los requerimientos específicos de Talento Humano una vez se definan los campos y el flujo de aprobación.'
                )
              }
              style={{
                backgroundColor: '#0284C7',
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="options-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Opciones del Módulo
              </Text>
            </Pressable>
          </View>

          {/* Bloques de simulación / estructura futura */}
          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: 16,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.cardBg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 20,
                gap: 10,
              }}
            >
              <Ionicons name="document-text-outline" size={26} color="#38BDF8" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                Acuerdos y Solicitudes
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, lineHeight: 18 }}>
                Recepción y formalización de solicitudes de servidores para laborar en modalidad suplementaria o autónoma.
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.cardBg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 20,
                gap: 10,
              }}
            >
              <Ionicons name="calendar-outline" size={26} color="#38BDF8" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                Planificación Semanal
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, lineHeight: 18 }}>
                Distribución de días en sede y días de teletrabajo para garantizar el aforo y la operatividad de cada dependencia.
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.cardBg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 20,
                gap: 10,
              }}
            >
              <Ionicons name="analytics-outline" size={26} color="#38BDF8" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                Seguimiento de Metas
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, lineHeight: 18 }}>
                Carga de evidencias y reportes periódicos de cumplimiento acordados con los líderes de área.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Modal Informativo (Regla: Usar modals en vez de alerts) */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: '#0F2133',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                padding: 22,
                maxWidth: 460,
                width: '100%',
                gap: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="information-circle" size={24} color="#38BDF8" />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                  {modalTitle}
                </Text>
              </View>
              <Text style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 19 }}>
                {modalMsg}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={{
                  alignSelf: 'flex-end',
                  backgroundColor: '#0284C7',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginTop: 6,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  Entendido
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
