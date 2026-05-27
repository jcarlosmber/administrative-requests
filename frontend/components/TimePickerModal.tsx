import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  selectedValue?: string;
  title?: string;
}

const COLORS = {
  primary: '#0077B6', // Azul institucional
  primaryLight: '#ADE8F4',
  primaryDark: '#023E8A',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  success: '#10B981',
  white: '#FFFFFF',
  tint: 'rgba(0, 119, 182, 0.08)'
};

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const SUGGESTIONS = ['07:30 AM', '08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:30 PM', '06:00 PM'];

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedValue = '',
  title = 'Seleccionar Hora'
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const [hour, setHour] = useState('8');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // Inicializar estados según el valor recibido
  useEffect(() => {
    if (selectedValue) {
      const match = selectedValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        setHour(parseInt(match[1], 10).toString());
        setMinute(match[2]);
        setPeriod(match[3].toUpperCase() as 'AM' | 'PM');
      }
    }
  }, [selectedValue, visible]);

  const handleConfirm = () => {
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    const finalTime = `${formattedHour}:${formattedMinute} ${period}`;
    onSelect(finalTime);
    onClose();
  };

  const handleSelectShortcut = (timeStr: string) => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      const h = parseInt(match[1], 10).toString();
      const m = match[2];
      const p = match[3].toUpperCase() as 'AM' | 'PM';
      setHour(h);
      setMinute(m);
      setPeriod(p);
      
      // Auto-confirmación rápida al elegir atajo si se desea, o solo preseleccionar.
      // Es mejor preseleccionar y dejar que confirmen o confirmarlo directamente.
      // Daremos una experiencia de confirmación rápida automática para agilizar:
      const finalTime = `${match[1].padStart(2, '0')}:${m} ${p}`;
      onSelect(finalTime);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={[s.sheet, isDesktop && s.sheetDesk]}>
          {/* Header */}
          <View style={s.head}>
            <View style={s.headTitleRow}>
              <View style={s.iconWrapper}>
                <Ionicons name="time" size={20} color={COLORS.primary} />
              </View>
              <Text style={s.tt}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            
            {/* Vista Previa de la Hora Seleccionada */}
            <View style={s.previewCard}>
              <Text style={s.previewLabel}>HORA PROGRAMADA</Text>
              <Text style={s.previewTime}>
                {hour.padStart(2, '0')}:{minute} <Text style={s.previewPeriod}>{period}</Text>
              </Text>
            </View>

            {/* Accesos Rápidos */}
            <Text style={s.sectionTitle}>Sugerencias comunes</Text>
            <View style={s.shortcutsRow}>
              {SUGGESTIONS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={s.shortcutPill}
                  onPress={() => handleSelectShortcut(item)}
                >
                  <Ionicons name="flash-outline" size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={s.shortcutText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selector de AM/PM */}
            <Text style={s.sectionTitle}>Jornada</Text>
            <View style={s.periodContainer}>
              <TouchableOpacity
                style={[s.periodBtn, period === 'AM' && s.periodBtnActive]}
                onPress={() => setPeriod('AM')}
              >
                <Ionicons name="sunny-outline" size={16} color={period === 'AM' ? COLORS.white : COLORS.muted} style={{ marginRight: 6 }} />
                <Text style={[s.periodText, period === 'AM' && s.periodTextActive]}>AM (Mañana)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.periodBtn, period === 'PM' && s.periodBtnActive]}
                onPress={() => setPeriod('PM')}
              >
                <Ionicons name="moon-outline" size={16} color={period === 'PM' ? COLORS.white : COLORS.muted} style={{ marginRight: 6 }} />
                <Text style={[s.periodText, period === 'PM' && s.periodTextActive]}>PM (Tarde/Noche)</Text>
              </TouchableOpacity>
            </View>

            {/* Selector de Hora (1-12) */}
            <Text style={s.sectionTitle}>Selecciona la Hora</Text>
            <View style={s.grid}>
              {HOURS.map((h) => {
                const isActive = hour === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[s.gridItem, isActive && s.gridItemActive]}
                    onPress={() => setHour(h)}
                  >
                    <Text style={[s.gridText, isActive && s.gridTextActive]}>
                      {h.padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selector de Minutos */}
            <Text style={s.sectionTitle}>Selecciona los Minutos</Text>
            <View style={s.grid}>
              {MINUTES.map((m) => {
                const isActive = minute === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[s.gridItem, s.gridItemMinute, isActive && s.gridItemActive]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[s.gridText, isActive && s.gridTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
              <Text style={s.confirmBtnText}>Confirmar Hora</Text>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25
  },
  sheetDesk: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '90%',
    borderRadius: 32,
    marginBottom: 40,
    maxHeight: '85%'
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line
  },
  headTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.tint,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tt: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    paddingVertical: 15
  },
  previewCard: {
    backgroundColor: COLORS.tint,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 4
  },
  previewTime: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primaryDark
  },
  previewPeriod: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 15,
    marginBottom: 10,
    marginLeft: 4
  },
  shortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  shortcutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  periodBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  periodText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted
  },
  periodTextActive: {
    color: COLORS.white
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  gridItem: {
    width: '22.8%', // Aproximadamente 4 columnas por fila con gap
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card
  },
  gridItemMinute: {
    width: '22.8%' // 4 columnas
  },
  gridItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  gridText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text
  },
  gridTextActive: {
    color: COLORS.white
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 16
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.muted
  },
  confirmBtn: {
    flex: 1.5,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white
  }
});
