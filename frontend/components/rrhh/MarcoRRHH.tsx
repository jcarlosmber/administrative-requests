import React, { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

/**
 * Marco común de los módulos de Talento Humano: menú lateral fijo (escritorio) con
 * los cuatro módulos, igual al esquema de la app de supervisión de contratos.
 * En pantallas angostas no se muestra el menú y cada módulo conserva su botón "Volver".
 */

export const TH = {
  marca50: '#EEF4FB',
  marca100: '#D6E4F4',
  marca600: '#1F5A96',
  marca700: '#174A7E',
  marca800: '#123A63',
  marca900: '#0D2A48',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate900: '#0F172A',
  blanco: '#FFFFFF',
};

const MarcoCtx = createContext<{ enMenu: boolean }>({ enMenu: false });
/** true cuando el módulo se muestra dentro del menú lateral (escritorio). */
export const useMarcoRRHH = () => useContext(MarcoCtx);

type Item = { ruta: string; titulo: string; icono: keyof typeof Ionicons.glyphMap; activoSi: (p: string) => boolean };

const ITEMS: Item[] = [
  { ruta: '/rrhh', titulo: 'Inicio Talento Humano', icono: 'home-outline', activoSi: (p) => p === '/rrhh' || p === '/rrhh/' },
  { ruta: '/ingresos', titulo: 'Validación Técnica de Ingresos', icono: 'shield-checkmark-outline', activoSi: (p) => p.startsWith('/ingresos') },
  { ruta: '/rrhh/teletrabajo', titulo: 'Gestión de Teletrabajo', icono: 'laptop-outline', activoSi: (p) => p.startsWith('/rrhh/teletrabajo') },
  {
    ruta: '/rrhh/vinculaciones-desvinculaciones', titulo: 'Vinculaciones y Desvinculaciones', icono: 'people-outline',
    activoSi: (p) => p.startsWith('/rrhh/vinculaciones') || p.startsWith('/rrhh/desvinculaciones'),
  },
  { ruta: '/rrhh/nomina', titulo: 'Gestión de Planta y Nómina', icono: 'briefcase-outline', activoSi: (p) => p.startsWith('/rrhh/nomina') },
];

const ROLES: Record<string, string> = {
  superadmin: 'Super administrador',
  admin: 'Administrador',
  usuario: 'Usuario',
};

function MenuLateral() {
  const router = useRouter();
  const ruta = usePathname() || '';
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getUser().then(({ data }: any) => {
      const u = data?.user;
      if (vivo && u) setUsuario({ nombre: u.full_name || u.name || u.email || '', rol: ROLES[u.role] || u.role || '' });
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  return (
    <View
      style={{
        width: 232,
        backgroundColor: TH.marca900,
        paddingTop: 22,
        paddingBottom: 16,
        justifyContent: 'space-between',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <View>
        <View style={{ paddingHorizontal: 20, marginBottom: 22 }}>
          <Text style={{ color: 'rgba(214,228,244,0.6)', fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' }}>
            SASGE · Secretaría Jurídica
          </Text>
          <Text style={{ color: TH.blanco, fontSize: 18, fontWeight: '700', marginTop: 3 }}>Talento Humano</Text>
        </View>

        <View style={{ paddingHorizontal: 10, gap: 3 }}>
          {ITEMS.map((it) => {
            const activo = it.activoSi(ruta);
            return (
              <Pressable
                key={it.ruta}
                onPress={() => router.push(it.ruta as any)}
                accessibilityRole="link"
                accessibilityState={{ selected: activo }}
                style={({ hovered, pressed }: any) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderRadius: 8,
                  backgroundColor: activo ? 'rgba(255,255,255,0.11)' : hovered || pressed ? 'rgba(255,255,255,0.05)' : 'transparent',
                })}
              >
                <Ionicons name={it.icono} size={17} color={activo ? TH.blanco : 'rgba(214,228,244,0.7)'} />
                <Text
                  numberOfLines={2}
                  style={{ flex: 1, color: activo ? TH.blanco : 'rgba(214,228,244,0.8)', fontSize: 13.5, fontWeight: activo ? '600' : '500' }}
                >
                  {it.titulo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', gap: 10 }}>
        {usuario && (
          <View>
            <Text numberOfLines={1} style={{ color: TH.blanco, fontSize: 13, fontWeight: '600' }}>{usuario.nombre}</Text>
            {!!usuario.rol && <Text style={{ color: 'rgba(214,228,244,0.6)', fontSize: 11.5, marginTop: 1 }}>{usuario.rol}</Text>}
          </View>
        )}
        <Pressable onPress={() => router.push('/dashboard' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="grid-outline" size={13} color="rgba(214,228,244,0.7)" />
          <Text style={{ color: 'rgba(214,228,244,0.75)', fontSize: 12 }}>Servicios Generales</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="arrow-back-outline" size={13} color="rgba(214,228,244,0.7)" />
          <Text style={{ color: 'rgba(214,228,244,0.75)', fontSize: 12 }}>Portal principal</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function MarcoRRHH({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  // Desde 1200 px: con menos ancho los módulos quedan apretados al restar el menú
  const enMenu = width >= 1200;
  return (
    <MarcoCtx.Provider value={{ enMenu }}>
      {enMenu ? (
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: TH.slate50 }}>
          <MenuLateral />
          <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </MarcoCtx.Provider>
  );
}

/** Envuelve una pantalla que no está dentro de app/rrhh (p. ej. /ingresos) con el mismo menú. */
export function conMarcoRRHH<P extends object>(Pantalla: React.ComponentType<P>) {
  const Envuelta = (props: P) => (
    <MarcoRRHH>
      <Pantalla {...props} />
    </MarcoRRHH>
  );
  Envuelta.displayName = `ConMarcoRRHH(${Pantalla.displayName || Pantalla.name || 'Pantalla'})`;
  return Envuelta;
}
