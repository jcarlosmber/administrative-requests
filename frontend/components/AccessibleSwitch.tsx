import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AccessibleSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  thumbColor?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  showLabels?: boolean;
}

export function AccessibleSwitch({
  value,
  onValueChange,
  activeColor = '#E63946',
  inactiveColor = '#334155',
  thumbColor = '#FFFFFF',
  disabled = false,
  accessibilityLabel = 'Interruptor',
  showLabels = true,
}: AccessibleSwitchProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          backgroundColor: value ? activeColor : inactiveColor,
          borderColor: value ? activeColor : '#64748B',
        },
        disabled && styles.disabled,
      ]}
    >
      {showLabels && (
        <Text style={[styles.switchStatusText, value ? styles.textOn : styles.textOff]}>
          {value ? 'SÍ' : 'NO'}
        </Text>
      )}
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor,
            left: value ? 28 : 2,
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    paddingHorizontal: 2,
    position: 'relative',
    cursor: 'pointer',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    top: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  switchStatusText: {
    fontSize: 9,
    fontWeight: '900',
    position: 'absolute',
  },
  textOn: {
    left: 7,
    color: '#FFFFFF',
  },
  textOff: {
    right: 7,
    color: '#CBD5E1',
  },
  disabled: {
    opacity: 0.5,
  },
});
