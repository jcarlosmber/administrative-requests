import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AdministrativeRequest } from '../lib/requestService';

interface RequestCardProps {
  request: AdministrativeRequest;
  onPress: (request: AdministrativeRequest) => void;
}

const statusColors: Record<AdministrativeRequest['status'], string> = {
  pendiente: '#FFB300',
  en_progreso: '#1E88E5',
  resuelto: '#43A047',
  rechazado: '#E53935',
};

const priorityColors: Record<AdministrativeRequest['priority'], string> = {
  baja: '#66BB6A',
  media: '#FFA726',
  alta: '#EF5350',
};

export const RequestCard: React.FC<RequestCardProps> = ({ request, onPress }) => {
  return (
    <TouchableOpacity 
      onPress={() => onPress(request)}
      style={styles.card}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{request.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[request.status] }]}>
          <Text style={styles.badgeText}>{request.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {request.description}
      </Text>
      
      <View style={styles.footer}>
        <View style={styles.metaInfo}>
          <Text style={styles.category}>{request.category}</Text>
          <View style={styles.dot} />
          <Text style={[styles.priority, { color: priorityColors[request.priority] }]}>
            Prioridad {request.priority}
          </Text>
        </View>
        <Text style={styles.date}>
          {new Date(request.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  priority: {
    fontSize: 13,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
