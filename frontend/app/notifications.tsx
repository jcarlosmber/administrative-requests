import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: "#a9301e",
  background: "#F8FAFC",
  white: "#FFFFFF",
  textDark: "#1E293B",
  textGray: "#64748B",
  border: "#E2E8F0",
};

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Solicitud Aprobada',
    message: 'Tu solicitud de acceso para el contratista Sarah C. ha sido aprobada.',
    time: 'Hace 10 min',
    icon: 'checkmark-circle',
    color: '#10B981',
    unread: true,
  },
  {
    id: '2',
    title: 'Recordatorio de Transporte',
    message: 'Tu vehículo Nissan Kicks llegará en 15 minutos al punto de origen.',
    time: 'Hace 1 hora',
    icon: 'car',
    color: '#3B82F6',
    unread: true,
  },
  {
    id: '3',
    title: 'Actualización de Sistema',
    message: 'Se realizará un mantenimiento programado este domingo a las 8:00 AM.',
    time: 'Hace 5 horas',
    icon: 'construct',
    color: '#F59E0B',
    unread: false,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();

  const renderItem = ({ item }: { item: typeof NOTIFICATIONS[0] }) => (
    <TouchableOpacity style={[styles.notificationCard, item.unread && styles.unreadCard]}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon as any} size={22} color={item.color} />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.cardHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <Text style={styles.messageText} numberOfLines={2}>{item.message}</Text>
      </View>
      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <TouchableOpacity style={styles.markReadBtn}>
          <Text style={styles.markReadText}>Leer todo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={NOTIFICATIONS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No tienes notificaciones nuevas</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  markReadBtn: {
    paddingHorizontal: 10,
  },
  markReadText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: 15,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unreadCard: {
    borderColor: COLORS.primary + '20',
    backgroundColor: COLORS.primary + '05',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textGray,
  },
  messageText: {
    fontSize: 13,
    color: COLORS.textGray,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
