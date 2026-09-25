import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdministrativeRequest, requestService } from '../../lib/requestService';

export default function CorrectRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<AdministrativeRequest | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [metadataText, setMetadataText] = useState('');
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const current = await requestService.getById(String(id));
      setRequest(current);
      setTitle(current.title || '');
      setDescription(current.description || '');
      const meta = { ...(current.metadata || {}) };
      setMetadataText(JSON.stringify(meta, null, 2));
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la solicitud.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!request || !title.trim() || !description.trim()) {
      setError('Por favor completa el asunto y la descripción.');
      return;
    }
    try {
      setSaving(true);
      setError('');

      let metadata = {};
      try {
        metadata = metadataText.trim() ? JSON.parse(metadataText) : (request.metadata || {});
      } catch (jsonErr) {
        setError('El formato de datos adicionales contiene un error de sintaxis.');
        setSaving(false);
        return;
      }

      delete (metadata as any).returned_for_correction;
      (metadata as any).corrected_at = new Date().toISOString();
      if (correctionNotes.trim()) {
        (metadata as any).correction_notes = correctionNotes.trim();
      }

      await requestService.update(request.id, {
        title: title.trim(),
        description: description.trim(),
        metadata
      });

      setSuccessModalVisible(true);
    } catch (e: any) {
      setError(e.message || 'No fue posible guardar la corrección.');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (category?: string) => {
    const map: Record<string, string> = {
      visitors: 'Ingreso Visitantes',
      transport: 'Transporte Institucional',
      maintenance: 'Mantenimientos Locativos',
      rooms: 'Reserva de Salas',
      parking: 'Parqueadero Institucional'
    };
    return map[category || ''] || category || 'Solicitud';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#B45309" />
          <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>Cargando información...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const returnReason = request?.metadata?.return_reason || request?.admin_notes || 'Revisa y ajusta la información requerida por el administrador.';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Corregir Solicitud', headerShown: false }} />

      {/* Header Barra Superior */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subsanar / Corregir Solicitud</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner de Solicitud Devuelta */}
        <View style={styles.notice}>
          <View style={styles.noticeIconWrap}>
            <Ionicons name="return-down-back" size={24} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <Text style={styles.noticeTitle}>Solicitud Devuelta por la Administración</Text>
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{getCategoryLabel(request?.category)}</Text>
              </View>
            </View>
            <Text style={styles.noticeText}>
              El administrador devolvió esta solicitud para que subsanes o ajustes lo siguiente:
            </Text>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonText}>"{returnReason}"</Text>
            </View>
          </View>
        </View>

        {/* Campos Principales */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>Información a Corregir</Text>

          <Text style={styles.label}>Asunto de la Solicitud <Text style={styles.reqStar}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Título o asunto del requerimiento"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Descripción Detallada <Text style={styles.reqStar}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe con precisión la corrección o solicitud"
            placeholderTextColor="#94A3B8"
            multiline
          />

          <Text style={styles.label}>Aclaraciones o Respuestas para el Administrador (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.multilineShort]}
            value={correctionNotes}
            onChangeText={setCorrectionNotes}
            placeholder="Indica qué cambios realizaste o aclaraciones sobre la devolución..."
            placeholderTextColor="#94A3B8"
            multiline
          />

          {/* Toggle Datos Técnicos Avanzados */}
          <TouchableOpacity
            style={styles.toggleAdvBtn}
            onPress={() => setShowMetadataEditor(!showMetadataEditor)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showMetadataEditor ? 'chevron-up-circle-outline' : 'chevron-down-circle-outline'}
              size={18}
              color="#0284C7"
            />
            <Text style={styles.toggleAdvText}>
              {showMetadataEditor ? 'Ocultar datos adicionales del formulario' : 'Ver / modificar datos complementarios del formulario'}
            </Text>
          </TouchableOpacity>

          {showMetadataEditor && (
            <View style={styles.advContainer}>
              <Text style={styles.help}>
                Modifica únicamente los campos que requieras ajustar. Conserva la estructura de comillas y llaves.
              </Text>
              <TextInput
                style={[styles.input, styles.metadataInput]}
                value={metadataText}
                onChangeText={setMetadataText}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Botón Guardar y Reenviar */}
          <TouchableOpacity
            style={[styles.button, saving && { opacity: 0.7 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Guardar y Reenviar Solicitud</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Éxito al Corregir */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSuccessModalVisible(false);
          router.replace('/dashboard/requests');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-done" size={40} color="#059669" />
            </View>
            <Text style={styles.modalTitle}>¡Solicitud Reenviada con Éxito!</Text>
            <Text style={styles.modalDesc}>
              Tus correcciones han sido guardadas. La solicitud ha retornado a la bandeja de gestión de la administración para su revisión y aprobación.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setSuccessModalVisible(false);
                router.replace('/dashboard/requests');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>Ir a Mis Solicitudes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  backText: {
    marginLeft: 6,
    fontWeight: '700',
    color: '#1E293B',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    padding: 20,
    gap: 16,
  },
  notice: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  noticeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400E',
  },
  noticeText: {
    color: '#78350F',
    lineHeight: 20,
    marginTop: 6,
    fontSize: 13.5,
  },
  reasonBox: {
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
  },
  reasonText: {
    color: '#78350F',
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  catBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  catBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  reqStar: {
    color: '#DC2626',
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
    fontSize: 14.5,
    color: '#0F172A',
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  multilineShort: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleAdvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 8,
    paddingVertical: 6,
  },
  toggleAdvText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '700',
  },
  advContainer: {
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  help: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  metadataInput: {
    minHeight: 200,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    fontSize: 12.5,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F87171',
    marginTop: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#D97706',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
