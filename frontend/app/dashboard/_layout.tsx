import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
        tabBarActiveBackgroundColor: 'rgba(255, 255, 255, 0.15)',
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 10,
          marginVertical: 6,
          paddingVertical: 2,
        },
        tabBarStyle: {
          backgroundColor: 'rgb(71, 23, 29)',
          borderTopWidth: 0,
          height: 72,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests/index"
        options={{
          title: 'Mis Solicitudes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
