import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
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
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="policy" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen 
          name="requests/new" 
          options={{ 
            presentation: 'modal',
            title: 'Mantenimiento'
          }} 
        />
        <Stack.Screen 
          name="requests/parking" 
          options={{ 
            presentation: 'modal',
            title: 'Parqueadero'
          }} 
        />
        <Stack.Screen 
          name="requests/transport" 
          options={{ 
            presentation: 'modal',
            title: 'Transporte'
          }} 
        />
        <Stack.Screen 
          name="requests/visitors" 
          options={{ 
            presentation: 'modal',
            title: 'Visitantes'
          }} 
        />
        <Stack.Screen 
          name="requests/rooms" 
          options={{ 
            presentation: 'modal',
            title: 'Reserva de Salas'
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
    </>
  );
}
