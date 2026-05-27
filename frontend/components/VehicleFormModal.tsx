import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DependencySelector } from './DependencySelector';

const COLORS = {
  primary: '#A9301E',
  primaryDark: '#7D1F13',
  dark: '#0F172A',
  white: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  line: '#E2E8F0',
  success: '#10B981',
};

interface VehicleFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (vehicleData: { 
    plate: string; 
    brand: string; 
    color?: string;
    name: string;
    doc: string;
    dependency: string;
  }) => Promise<void>;
  initialData?: { 
    id?: string; 
    plate: string; 
    brand: string; 
    color?: string;
    name?: string;
    doc?: string;
    dependency?: string;
  } | null;
}

export const VehicleFormModal = ({ visible, onClose, onSave, initialData }: VehicleFormModalProps) => {
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [dependency, setDependency] = useState('');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState(''); // Representa Marca / Modelo
  const [color, setColor] = useState('');
  const [showDepSelector, setShowDepSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDoc(initialData.doc || '');
      setDependency(initialData.dependency || '');
      setPlate(initialData.plate || '');
      setBrand(initialData.brand || '');
      setColor(initialData.color || '');
    } else {
      setName('');
      setDoc('');
      setDependency('');
      setPlate('');
      setBrand('');
      setColor('');
    }
    setShowDepSelector(false);
    setErrorMsg('');
  }, [initialData, visible]);

  const handleSubmit = async () => {
    if (!name.trim() || !doc.trim() || !dependency.trim() || !plate.trim() || !brand.trim()) {
      setErrorMsg('Por favor, complete los campos obligatorios (*).');
      return;
    }
    
    const cleanPlate = plate.trim().toUpperCase();
    if (cleanPlate.length < 3) {
      setErrorMsg('La placa debe tener al menos 3 caracteres.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await onSave({
        plate: cleanPlate,
        brand: brand.trim(),
        color: color.trim() || undefined,
        name: name.trim(),
        doc: doc.trim(),
        dependency: dependency.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(15,23,42,.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
      >
        <View style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
          maxHeight: '90%',
        }}>
          {/* Header */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="car-sport" size={24} color="#FFF" />
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFF' }}>
                {initialData ? 'Editar Vehículo' : 'Registrar Vehículo'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={loading} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(169, 48, 30, 0.08)',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(169, 48, 30, 0.2)'
              }}>
                <Ionicons name="alert-circle" size={20} color={COLORS.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary, flex: 1 }}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Nombre Completo */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>Nombre Completo *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Juan Pérez"
                placeholderTextColor={COLORS.muted}
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            {/* Cédula / ID y Placa (Fila) */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>Cédula / ID *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 1.000.000"
                  placeholderTextColor={COLORS.muted}
                  value={doc}
                  onChangeText={setDoc}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>Placa *</Text>
                <TextInput
                  style={[styles.textInput, { fontWeight: '700' }]}
                  placeholder="Ej. ABC123"
                  placeholderTextColor={COLORS.muted}
                  value={plate}
                  onChangeText={setPlate}
                  autoCapitalize="characters"
                  maxLength={6}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Dependencia */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>Dependencia *</Text>
              <TouchableOpacity
                onPress={() => setShowDepSelector(true)}
                disabled={loading}
                style={{
                  height: 50,
                  borderWidth: 1.5,
                  borderColor: COLORS.line,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FAFBFD'
                }}
              >
                <Text style={{ fontSize: 15, color: dependency ? COLORS.dark : COLORS.muted, fontWeight: dependency ? '600' : '500' }}>
                  {dependency || 'Seleccionar dependencia'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
              </TouchableOpacity>

              <DependencySelector
                visible={showDepSelector}
                onClose={() => setShowDepSelector(false)}
                onSelect={(val: string) => setDependency(val)}
                selectedValue={dependency}
              />
            </View>

            {/* Marca / Modelo y Color (Fila) */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>Marca / Modelo *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Nissan Kicks 2024"
                  placeholderTextColor={COLORS.muted}
                  value={brand}
                  onChangeText={setBrand}
                  editable={!loading}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>Color (Opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Gris"
                  placeholderTextColor={COLORS.muted}
                  value={color}
                  onChangeText={setColor}
                  editable={!loading}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={{
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: COLORS.line,
            padding: 20,
            gap: 12,
            backgroundColor: '#F8FAFC'
          }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 14,
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
              onPress={handleSubmit}
              disabled={loading}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={18} color="#FFF" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>Guardar</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  textInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.dark,
    backgroundColor: '#FAFBFD'
  }
});
