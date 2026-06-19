import 'react-native-url-polyfill/auto';

let API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

if (typeof window !== 'undefined' && window.location) {
  const hostname = window.location.hostname;
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Si estamos en producción/pruebas y accedemos por IP, apunta al puerto 3000 de esa IP
    API_URL = `http://${hostname}:3000`;
  }
}

// Almacenamiento adaptativo para web y dispositivos móviles en memoria
const isWeb = typeof window !== 'undefined' && window.localStorage;
const memoryStorage: Record<string, string> = {};

export const appStorage = {
  getItem: async (key: string) => {
    if (isWeb) return window.localStorage.getItem(key);
    return memoryStorage[key] || null;
  },
  setItem: async (key: string, value: string) => {
    if (isWeb) window.localStorage.setItem(key, value);
    else memoryStorage[key] = value;
  },
  removeItem: async (key: string) => {
    if (isWeb) window.localStorage.removeItem(key);
    else delete memoryStorage[key];
  }
};

class SupabaseAuthEmulated {
  async getUser() {
    try {
      const token = await appStorage.getItem('auth_token');
      if (!token) return { data: { user: null }, error: null };
      
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        return { data: { user: null }, error: new Error('Sesión no válida') };
      }
      const data = await res.json();
      return { data: { user: data.user }, error: null };
    } catch (e: any) {
      return { data: { user: null }, error: e };
    }
  }

  async signInWithPassword({ email, password }: any) {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { data: { user: null, session: null }, error: new Error(data.error || 'Error de inicio de sesión') };
      }
      await appStorage.setItem('auth_token', data.token);
      return { data: { user: data.user, session: { access_token: data.token } }, error: null };
    } catch (e: any) {
      return { data: { user: null, session: null }, error: e };
    }
  }

  async signUp({ email, password, options }: any) {
    try {
      const name = options?.data?.name || email.split('@')[0];
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (!res.ok) {
        return { data: { user: null, session: null }, error: new Error(data.error || 'Error de registro') };
      }
      await appStorage.setItem('auth_token', data.token);
      return { data: { user: data.user, session: { access_token: data.token } }, error: null };
    } catch (e: any) {
      return { data: { user: null, session: null }, error: e };
    }
  }

  async signOut() {
    await appStorage.removeItem('auth_token');
    return { error: null };
  }
}

class SupabaseClientEmulated {
  auth = new SupabaseAuthEmulated();

  from(tableName: string) {
    const chain: any = {
      select: (cols?: any) => chain,
      insert: (vals: any) => chain,
      update: (vals: any) => chain,
      delete: () => chain,
      eq: (col: any, val: any) => chain,
      order: (col: any, options?: any) => chain,
      single: () => chain,
      then: (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
        const result = { data: null, error: new Error(`Emulador local de Supabase: Tabla '${tableName}' no soportada por el SDK.`) };
        return Promise.resolve(result).then(onfulfilled, onrejected);
      }
    };
    return chain;
  }

  channel(name: string) {
    return {
      on(event: string, filter: any, callback: Function) {
        return this;
      },
      subscribe() {
        return this;
      }
    };
  }

  removeChannel(channel: any) {
    // No-op
  }
}

export const supabase = new SupabaseClientEmulated() as any;
