import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestService } from '../lib/requestService';

const COLORS = {
  primary: '#A9301E',
  warning: '#F59E0B',
  white: '#FFFFFF',
  muted: '#64748B',
  line: '#E2E8F0',
  text: '#1E293B',
};

interface EvaluationModalProps {
  visible: boolean;
  requestId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EvaluationModal({ visible, requestId, onClose, onSuccess }: EvaluationModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!requestId || rating === 0) return;
    
    try {
      setLoading(true);
      await requestService.evaluateRequest(requestId, { rating, comment: comment.trim() });
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error al evaluar:', err);
      // Fallback
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.warning}15` }]}>
              <Ionicons name="star" size={35} color={COLORS.warning} />
            </View>
          </View>
          <Text style={styles.modalTitle}>Evaluar Servicio</Text>
          <Text style={styles.modalMessage}>Por favor califica el servicio recibido y déjanos tus comentarios para mejorar.</Text>
          
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7} style={{ padding: 5 }}>
                <Ionicons 
                  name={rating >= star ? "star" : "star-outline"} 
                  size={36} 
                  color={COLORS.warning} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ width: '100%', marginBottom: 20 }}>
            <TextInput
              style={styles.commentInput}
              placeholder="Escribe un comentario (opcional)"
              placeholderTextColor={COLORS.muted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <TouchableOpacity 
              style={[styles.modalBtn, { flex: 1, backgroundColor: COLORS.line }]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.modalBtnText, { color: COLORS.muted }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalBtn, { flex: 1, backgroundColor: COLORS.warning, opacity: rating === 0 ? 0.5 : 1 }]}
              onPress={handleSubmit}
              disabled={rating === 0 || loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.modalBtnText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 360, backgroundColor: COLORS.white, borderRadius: 24, padding: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 5 }, shadowRadius: 15 },
  modalHeader: { width: '100%', alignItems: 'center' },
  modalIconBox: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 20, lineHeight: 20, fontWeight: '500' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 5 },
  commentInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 80, textAlignVertical: 'top' },
  modalBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', height: 50 },
  modalBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
