import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#A9301E',
  warning: '#F59E0B',
  white: '#FFFFFF',
  muted: '#64748B',
  line: '#E2E8F0',
};

interface ConfirmActionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmActionModal({
  visible,
  onClose,
  onConfirm,
  title = "Confirmar acción",
  message = "¿Estás seguro de que deseas proceder con esta acción?",
  confirmText = "Confirmar",
  cancelText = "Cancelar"
}: ConfirmActionModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconBox, { backgroundColor: `${COLORS.warning}15` }]}>
              <Ionicons name="help-circle" size={35} color={COLORS.warning} />
            </View>
          </View>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 }}>
            <TouchableOpacity 
              style={[styles.modalBtn, { flex: 1, backgroundColor: COLORS.line }]}
              onPress={onClose}
            >
              <Text style={[styles.modalBtnText, { color: COLORS.muted }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalBtn, { flex: 1, backgroundColor: COLORS.primary }]}
              onPress={() => {
                onClose();
                onConfirm();
              }}
            >
              <Text style={styles.modalBtnText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 340, backgroundColor: COLORS.white, borderRadius: 24, padding: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 5 }, shadowRadius: 15 },
  modalHeader: { width: '100%', alignItems: 'center' },
  modalIconBox: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 25, lineHeight: 20, fontWeight: '500' },
  modalBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
