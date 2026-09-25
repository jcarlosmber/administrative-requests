import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestService, AdministrativeRequest } from '../lib/requestService';

const COLORS = {
  primary: '#A9301E',
  warning: '#F59E0B',
  white: '#FFFFFF',
  muted: '#64748B',
  line: '#E2E8F0',
  text: '#1E293B',
  dark: '#0F172A',
  bg: '#F8FAFC',
};

const CATEGORY_MAP: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  visitors: { label: 'Ingreso Visitantes', icon: 'people', color: '#E63946', bg: '#FEE2E2' },
  transport: { label: 'Transporte Oficial', icon: 'car-sport', color: '#0077B6', bg: '#E0F2FE' },
  maintenance: { label: 'Mantenimiento', icon: 'construct', color: '#2A9D8F', bg: '#CCFBF1' },
  rooms: { label: 'Reserva de Salas', icon: 'calendar', color: '#7209B7', bg: '#F3E8FF' },
  parking: { label: 'Parqueadero', icon: 'navigate-circle', color: '#F4A261', bg: '#FFEDD5' },
};

const RATING_LABELS: Record<number, string> = {
  1: '1/5 • Muy deficiente',
  2: '2/5 • Regular',
  3: '3/5 • Aceptable',
  4: '4/5 • Bueno',
  5: '5/5 • Excelente',
};

export interface EvaluationModalProps {
  visible: boolean;
  requestId?: string | null;
  request?: AdministrativeRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EvaluationModal({ visible, requestId, request, onClose, onSuccess }: EvaluationModalProps) {
  const [currentRequest, setCurrentRequest] = useState<AdministrativeRequest | null>(request || null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [rating, setRating] = useState(0);
  const [serviceTaken, setServiceTaken] = useState<boolean>(true);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (request) {
      setCurrentRequest(request);
    } else if (requestId && visible) {
      setLoadingRequest(true);
      requestService
        .getById(requestId)
        .then((res) => setCurrentRequest(res))
        .catch((err) => console.error('Error al obtener la solicitud para evaluar:', err))
        .finally(() => setLoadingRequest(false));
    } else if (!visible) {
      setCurrentRequest(null);
      setIsSubmitted(false);
      setSubmitError(null);
    }
  }, [request, requestId, visible]);

  const targetId = currentRequest?.id || requestId;

  const handleSubmit = async () => {
    if (!targetId || rating === 0) return;

    try {
      setLoading(true);
      setSubmitError(null);
      await requestService.evaluateRequest(targetId, { rating, comment: comment.trim(), serviceTaken });
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Error al evaluar solicitud:', err);
      setSubmitError(err?.message || 'Ocurrió un error al enviar la calificación. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setIsSubmitted(false);
    setSubmitError(null);
    onSuccess();
    handleClose();
  };

  const handleClose = () => {
    if (isSubmitted) {
      onSuccess();
    }
    setRating(0);
    setServiceTaken(true);
    setComment('');
    setIsSubmitted(false);
    setSubmitError(null);
    onClose();
  };

  const catConfig = currentRequest?.category
    ? CATEGORY_MAP[currentRequest.category] || { label: currentRequest.category, icon: 'document-text', color: COLORS.primary, bg: '#FEE2E2' }
    : null;

  const formattedDate = currentRequest?.created_at
    ? new Date(currentRequest.created_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const getHighlights = (req: AdministrativeRequest) => {
    const meta = req.metadata || {};
    const items: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [];

    switch (req.category) {
      case 'transport':
        if (meta.origin && meta.destination) {
          items.push({ icon: 'navigate-outline', text: `${meta.origin} → ${meta.destination}` });
        }
        if (meta.date) {
          items.push({ icon: 'time-outline', text: `${meta.date} ${meta.time || ''}`.trim() });
        }
        if (meta.passengers_count) {
          items.push({ icon: 'people-outline', text: `${meta.passengers_count} pasajero(s)` });
        }
        break;

      case 'rooms':
        const roomName = meta.room?.name || meta.room_name || (typeof meta.room === 'string' ? meta.room : null);
        if (roomName) {
          items.push({ icon: 'business-outline', text: `Espacio: ${roomName}` });
        }
        if (meta.date) {
          const schedule = meta.time || (meta.start_time && meta.end_time ? `${meta.start_time} - ${meta.end_time}` : '');
          items.push({ icon: 'calendar-outline', text: `${meta.date}${schedule ? ` • ${schedule}` : ''}` });
        }
        break;

      case 'maintenance':
        const locParts = [
          meta.location ? `Piso: ${meta.location}` : null,
          meta.room ? `Oficina: ${meta.room}` : null,
          meta.dependency ? `Dep: ${meta.dependency}` : null,
        ].filter(Boolean);
        if (locParts.length > 0) {
          items.push({ icon: 'location-outline', text: locParts.join(' • ') });
        }
        break;

      case 'visitors':
        if (Array.isArray(meta.visitors) && meta.visitors.length > 0) {
          const names = meta.visitors.map((v: any) => v.name).filter(Boolean).slice(0, 2).join(', ');
          const extra = meta.visitors.length > 2 ? ` (+${meta.visitors.length - 2})` : '';
          items.push({ icon: 'people-outline', text: `${meta.visitors.length} visitante(s): ${names}${extra}` });
        }
        if (meta.fromDate) {
          items.push({ icon: 'calendar-outline', text: `Vigencia: ${meta.fromDate} al ${meta.toDate || meta.fromDate}` });
        }
        break;

      case 'parking':
        if (meta.plate) {
          items.push({ icon: 'car-outline', text: `Vehículo: ${meta.plate} ${meta.brand ? `(${meta.brand})` : ''}` });
        }
        if (meta.dependency) {
          items.push({ icon: 'business-outline', text: meta.dependency });
        }
        break;
    }

    return items;
  };

  const highlights = currentRequest ? getHighlights(currentRequest) : [];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {isSubmitted ? (
            /* ============================================================== */
            /* PANTALLA / MODAL DE CONFIRMACIÓN DE CALIFICACIÓN EXITOSA      */
            /* ============================================================== */
            <View>
              {/* Header de confirmación */}
              <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.confirmHeaderBox}>
                    <Ionicons name="checkmark-circle" size={22} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>¡Calificación Registrada!</Text>
                    <Text style={styles.modalSubtitle}>Comprobante de calificación del servicio</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleFinish} style={styles.closeBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={COLORS.muted} />
                </TouchableOpacity>
              </View>

              {/* Contenido de confirmación */}
              <View style={styles.confirmBody}>
                <View style={styles.confirmBigIconBox}>
                  <Ionicons name="checkmark-done" size={46} color="#059669" />
                </View>

                <Text style={styles.confirmMainTitle}>¡Muchas gracias por tu valoración!</Text>
                <Text style={styles.confirmMainDesc}>
                  Tu calificación y observaciones han quedado registradas en el sistema SASGE. Tu opinión nos ayuda a seguir fortaleciendo la calidad de los servicios administrativos de la entidad.
                </Text>

                {/* Tarjeta de resumen de lo calificado */}
                <View style={styles.confirmSummaryCard}>
                  {catConfig && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={[styles.categoryBadge, { backgroundColor: catConfig.bg }]}>
                        <Ionicons name={catConfig.icon} size={14} color={catConfig.color} />
                        <Text style={[styles.categoryBadgeText, { color: catConfig.color }]}>
                          {catConfig.label}
                        </Text>
                      </View>
                      {formattedDate && (
                        <Text style={styles.serviceDateText}>{formattedDate}</Text>
                      )}
                    </View>
                  )}

                  {currentRequest?.title ? (
                    <Text style={styles.confirmSummaryTitle} numberOfLines={2}>
                      {currentRequest.title}
                    </Text>
                  ) : null}

                  {/* Fila de estrellas */}
                  <View style={styles.confirmRatingRow}>
                    <View style={{ flexDirection: 'row', gap: 3 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={rating >= star ? 'star' : 'star-outline'}
                          size={20}
                          color={COLORS.warning}
                        />
                      ))}
                    </View>
                    <Text style={styles.confirmRatingLabel}>
                      {RATING_LABELS[rating] || `${rating} / 5`}
                    </Text>
                  </View>

                  {/* Estado de uso del servicio */}
                  <View style={styles.confirmTakenRow}>
                    <Ionicons
                      name={serviceTaken ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={serviceTaken ? '#059669' : '#DC2626'}
                    />
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: serviceTaken ? '#059669' : '#DC2626',
                    }}>
                      {serviceTaken ? 'Servicio prestado / recibido' : 'Servicio no tomado'}
                    </Text>
                  </View>

                  {/* Comentario u observación si existe */}
                  {comment.trim() ? (
                    <View style={styles.confirmCommentBox}>
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.muted} style={{ marginTop: 2 }} />
                      <Text style={styles.confirmCommentText}>"{comment.trim()}"</Text>
                    </View>
                  ) : null}
                </View>

                {/* Botón de cierre / confirmación */}
                <TouchableOpacity
                  style={styles.confirmActionBtn}
                  onPress={handleFinish}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                  <Text style={styles.confirmActionBtnText}>Aceptar y Continuar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ============================================================== */
            /* FORMULARIO DE CALIFICACIÓN                                      */
            /* ============================================================== */
            <View>
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.modalIconBox}>
                    <Ionicons name="star" size={22} color={COLORS.warning} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Calificar Servicio</Text>
                    <Text style={styles.modalSubtitle}>Tu opinión nos ayuda a mejorar</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={COLORS.muted} />
                </TouchableOpacity>
              </View>

              {/* Banner de error si ocurrió alguno */}
              {submitError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{submitError}</Text>
                </View>
              )}

              <ScrollView
                style={{ width: '100%', maxHeight: 460 }}
                contentContainerStyle={{ paddingBottom: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Tarjeta de Información del Servicio */}
                {loadingRequest ? (
                  <View style={styles.serviceLoadingBox}>
                    <ActivityIndicator size="small" color={COLORS.warning} />
                    <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 6 }}>Cargando información del servicio...</Text>
                  </View>
                ) : currentRequest && (
                  <View style={styles.serviceCard}>
                    <View style={styles.serviceCardTop}>
                      {catConfig && (
                        <View style={[styles.categoryBadge, { backgroundColor: catConfig.bg }]}>
                          <Ionicons name={catConfig.icon} size={14} color={catConfig.color} />
                          <Text style={[styles.categoryBadgeText, { color: catConfig.color }]}>
                            {catConfig.label}
                          </Text>
                        </View>
                      )}
                      {formattedDate && (
                        <Text style={styles.serviceDateText}>{formattedDate}</Text>
                      )}
                    </View>

                    <Text style={styles.serviceTitleText}>
                      {currentRequest.title}
                    </Text>

                    {highlights.length > 0 && (
                      <View style={styles.highlightsBox}>
                        {highlights.map((item, idx) => (
                          <View key={idx} style={styles.highlightRow}>
                            <Ionicons name={item.icon} size={14} color={COLORS.muted} />
                            <Text style={styles.highlightText} numberOfLines={2}>
                              {item.text}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {currentRequest.description && currentRequest.description.trim() !== currentRequest.title.trim() && (
                      <Text style={styles.serviceDescText} numberOfLines={2}>
                        {currentRequest.description}
                      </Text>
                    )}
                  </View>
                )}

                {/* Selector ¿Se tomó el servicio? */}
                <View style={{ width: '100%', marginTop: 14, marginBottom: 16 }}>
                  <Text style={styles.sectionLabel}>
                    ¿El servicio fue efectivamente prestado / tomado?
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[
                        styles.serviceTakenBtn,
                        serviceTaken ? styles.serviceTakenBtnActiveYes : styles.serviceTakenBtnInactive,
                      ]}
                      onPress={() => setServiceTaken(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={serviceTaken ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={16}
                        color={serviceTaken ? '#059669' : COLORS.muted}
                      />
                      <Text style={[styles.serviceTakenText, { color: serviceTaken ? '#059669' : COLORS.muted }]}>
                        Sí, se tomó
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.serviceTakenBtn,
                        !serviceTaken ? styles.serviceTakenBtnActiveNo : styles.serviceTakenBtnInactive,
                      ]}
                      onPress={() => setServiceTaken(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={!serviceTaken ? 'close-circle' : 'close-circle-outline'}
                        size={16}
                        color={!serviceTaken ? '#DC2626' : COLORS.muted}
                      />
                      <Text style={[styles.serviceTakenText, { color: !serviceTaken ? '#DC2626' : COLORS.muted }]}>
                        No se tomó
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Calificación por Estrellas */}
                <View style={{ width: '100%', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={styles.sectionLabel}>
                    Calificación general
                  </Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        activeOpacity={0.7}
                        style={{ padding: 6 }}
                      >
                        <Ionicons
                          name={rating >= star ? 'star' : 'star-outline'}
                          size={34}
                          color={COLORS.warning}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.ratingFeedback, { color: rating > 0 ? '#B45309' : COLORS.muted }]}>
                    {rating > 0 ? RATING_LABELS[rating] : 'Toca una estrella para calificar'}
                  </Text>
                </View>

                {/* Comentario Opcional */}
                <View style={{ width: '100%', marginBottom: 10 }}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Escribe un comentario o sugerencia (opcional)..."
                    placeholderTextColor={COLORS.muted}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              {/* Botones de Acción */}
              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { opacity: rating === 0 || loading ? 0.5 : 1 },
                  ]}
                  onPress={handleSubmit}
                  disabled={rating === 0 || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="send" size={16} color={COLORS.white} />
                      <Text style={styles.submitBtnText}>Enviar Calificación</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalContent: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.line,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.25)',
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  modalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: `${COLORS.warning}18`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.dark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Service Card Box
  serviceCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 4,
  },
  serviceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  serviceDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
  },
  serviceTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
    lineHeight: 20,
    marginBottom: 8,
  },
  highlightsBox: {
    gap: 6,
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  serviceDescText: {
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  serviceLoadingBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },

  // Section
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  serviceTakenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  serviceTakenBtnActiveYes: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  serviceTakenBtnActiveNo: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  serviceTakenBtnInactive: {
    borderColor: COLORS.line,
    backgroundColor: '#F8FAFC',
  },
  serviceTakenText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Stars
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 4,
  },
  ratingFeedback: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  // Input
  commentInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: COLORS.text,
    minHeight: 75,
    textAlignVertical: 'top',
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.line,
    height: 46,
  },
  cancelBtnText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },

  // Confirm Screen Styles
  confirmHeaderBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBody: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  confirmBigIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMainDesc: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
    marginBottom: 18,
  },
  confirmSummaryCard: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 14,
  },
  confirmSummaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 10,
  },
  confirmRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  confirmRatingLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  confirmTakenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  confirmCommentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmCommentText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.text,
    flex: 1,
    lineHeight: 17,
  },
  confirmActionBtn: {
    width: '100%',
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  confirmActionBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
});
