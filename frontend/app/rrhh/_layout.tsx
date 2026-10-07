import React from 'react';
import { Stack } from 'expo-router';

export default function RRHHLayout() {
  return (
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
  );
}
