import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export interface ConfirmActionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'success' | 'info' | 'primary';
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: string;
  loading?: boolean;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}

const VARIANTS = {
  primary: {
    color: '#0F172A',
    bgLight: '#F1F5F9',
    borderColor: '#CBD5E1',
    badgeBg: '#E2E8F0',
    badgeColor: '#334155',
    defaultIcon: 'help-circle-outline' as const,
    gradient: ['#0F172A', '#1E293B'] as [string, string],
    confirmIcon: 'checkmark' as const,
  },
  warning: {
    color: '#D97706',
    bgLight: '#FFFBEB',
    borderColor: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeColor: '#92400E',
    defaultIcon: 'alert-circle-outline' as const,
    gradient: ['#F59E0B', '#D97706'] as [string, string],
    confirmIcon: 'checkmark-circle' as const,
  },
  danger: {
    color: '#DC2626',
    bgLight: '#FEF2F2',
    borderColor: '#FECACA',
    badgeBg: '#FEE2E2',
    badgeColor: '#991B1B',
    defaultIcon: 'trash-outline' as const,
    gradient: ['#EF4444', '#DC2626'] as [string, string],
    confirmIcon: 'trash' as const,
  },
  success: {
    color: '#059669',
    bgLight: '#ECFDF5',
    borderColor: '#A7F3D0',
    badgeBg: '#D1FAE5',
    badgeColor: '#065F46',
    defaultIcon: 'checkmark-circle-outline' as const,
    gradient: ['#10B981', '#059669'] as [string, string],
    confirmIcon: 'checkmark-circle' as const,
  },
  info: {
    color: '#2563EB',
    bgLight: '#EFF6FF',
    borderColor: '#BFDBFE',
    badgeBg: '#DBEAFE',
    badgeColor: '#1E40AF',
    defaultIcon: 'information-circle-outline' as const,
    gradient: ['#3B82F6', '#2563EB'] as [string, string],
    confirmIcon: 'arrow-forward-circle' as const,
  },
};

export default function ConfirmActionModal({
  visible,
  onClose,
  onConfirm,
  title = "Confirmar acción",
  message = "¿Estás seguro de que deseas proceder con esta acción?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning",
  icon,
  badge,
  loading = false,
  confirmDisabled = false,
  children
}: ConfirmActionModalProps) {
  const theme = VARIANTS[variant] || VARIANTS.warning;
  const displayIcon = icon || theme.defaultIcon;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.modalContent}>
          {/* Botón cerrar X */}
          <TouchableOpacity 
            style={styles.closeBtn}
            onPress={onClose}
            disabled={loading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>

          {/* Icon Box */}
          <View style={[styles.modalIconBox, { backgroundColor: theme.bgLight, borderColor: theme.borderColor }]}>
            <Ionicons name={displayIcon} size={36} color={theme.color} />
          </View>

          {/* Badge opcional */}
          {badge ? (
            <View style={[styles.badgeContainer, { backgroundColor: theme.badgeBg }]}>
              <Text style={[styles.badgeText, { color: theme.badgeColor }]}>{badge}</Text>
            </View>
          ) : null}

          {/* Title & Message */}
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>

          {/* Contenido extra opcional (avisos, fotos, etc.) */}
          {children}

          {/* Botones de Acción */}
          <View style={styles.btnRow}>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={17} color="#64748B" />
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.confirmBtn, 
                (confirmDisabled || loading) && { opacity: 0.5 },
                { shadowColor: theme.color }
              ]}
              disabled={confirmDisabled || loading}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name={theme.confirmIcon} size={17} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>{confirmText}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 10,
  },
  modalIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
  },
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
