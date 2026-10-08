import React from 'react';
import { Stack } from 'expo-router';
import { MarcoRRHH } from '../../components/rrhh/MarcoRRHH';

export default function RRHHLayout() {
  return (
    <MarcoRRHH>
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="nomina" options={{ headerShown: false }} />
      <Stack.Screen name="teletrabajo" options={{ headerShown: false }} />
      <Stack.Screen name="desvinculaciones" options={{ headerShown: false }} />
      <Stack.Screen name="vinculaciones-desvinculaciones" options={{ headerShown: false }} />
    </Stack>
    </MarcoRRHH>
  );
}
