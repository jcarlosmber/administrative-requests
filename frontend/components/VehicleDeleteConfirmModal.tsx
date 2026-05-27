import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#E3272A', // Rojo Oficial Bogotá (Manual 2025)
  primaryDark: '#B01C20', // Rojo Oscuro
  dark: '#0F172A',
  white: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  line: '#E2E8F0',
};

interface VehicleDeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  plate: string;
}

export const VehicleDeleteConfirmModal = ({ visible, onClose, onConfirm, plate }: VehicleDeleteConfirmModalProps) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      await onConfirm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(15,23,42,.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <View style={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          padding: 28,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
        }}>
          {/* Icon Wrap */}
          <View style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: 'rgba(169, 48, 30, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 18
          }}>
            <Ionicons name="trash-outline" size={34} color={COLORS.primary} />
          </View>

          {/* Title & Msg */}
          <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.dark, textAlign: 'center' }}>
            ¿Eliminar vehículo?
          </Text>
          <Text style={{ marginTop: 10, fontSize: 15, lineHeight: 22, color: COLORS.muted, textAlign: 'center' }}>
            Esta acción eliminará de forma permanente el vehículo con placa <Text style={{ fontWeight: '700', color: COLORS.dark }}>{plate}</Text> de su cuenta.
          </Text>

          {errorMsg ? (
            <Text style={{ marginTop: 10, fontSize: 13, color: COLORS.primary, fontWeight: '600', textAlign: 'center' }}>
              {errorMsg}
            </Text>
          ) : null}

          {/* Actions */}
          <View style={{ flexDirection: 'row', width: '100%', gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: COLORS.line,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#FFF'
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.muted }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={loading}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 16,
                overflow: 'hidden'
              }}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>Eliminar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
