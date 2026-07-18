import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Platform, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ChatbotModal } from '../components/ChatbotModal';

export default function RootLayout() {
  const router = useRouter();

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0F172A',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/dashboard');
                }
              }} 
              style={{ marginLeft: Platform.OS === 'web' ? 16 : 8, marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="policy" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen 
          name="faq" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="requests/new" 
          options={{ 
            presentation: 'modal',
            title: 'Mantenimiento',
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="requests/parking" 
          options={{ 
            presentation: 'modal',
            title: 'Parqueadero',
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="requests/transport" 
          options={{ 
            presentation: 'modal',
            title: 'Transporte',
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="requests/visitors" 
          options={{ 
            presentation: 'modal',
            title: 'Visitantes',
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="requests/rooms" 
          options={{ 
            presentation: 'modal',
            title: 'Reserva de Salas',
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="notifications" 
          options={{ 
            title: 'Notificaciones',
            headerShown: true
          }} 
        />
      </Stack>
      <StatusBar style="auto" />

      <ChatbotModal />
    </>
  );
}
