import React from 'react';
import { View, SafeAreaView, Pressable, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { MarcoRRHH, useMarcoRRHH } from '../../components/rrhh/MarcoRRHH';
import AsistentePeticionesOPEC from '../../components/rrhh/AsistentePeticionesOPEC';

export default function PeticionesOPECScreen() {
  const router = useRouter();
  const { enMenu } = useMarcoRRHH();

  return (
    <MarcoRRHH>
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <StatusBar style="dark" />
        <Stack.Screen options={{ title: 'Asistente de Peticiones OPEC', headerShown: false }} />
        <SafeAreaView style={{ flex: 1 }}>
          {!enMenu && (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Pressable
                onPress={() => router.push('/rrhh/nomina')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  backgroundColor: '#F1F5F9',
                }}
              >
                <Ionicons name="arrow-back" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>Volver a Nómina</Text>
              </Pressable>
            </View>
          )}

          <AsistentePeticionesOPEC />
        </SafeAreaView>
      </View>
    </MarcoRRHH>
  );
}
