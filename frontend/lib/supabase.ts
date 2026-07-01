import 'react-native-url-polyfill/auto';

export let API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

if (typeof window !== 'undefined' && window.location) {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    if (protocol === 'https:') {
      // En producción (HTTPS), el API suele estar servido a través del mismo proxy
      API_URL = `https://${hostname}`;
    } else {
      // Si estamos en pruebas locales (HTTP) por IP, apunta al puerto 3000 de esa IP
      API_URL = `http://${hostname}:3000`;
    }
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
      if (!res.ok) {
        let errorMsg = 'Error de inicio de sesión';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch(e) {
          errorMsg = `Error del servidor (${res.status})`;
        }
        return { data: { user: null, session: null }, error: new Error(errorMsg) };
      }
      const data = await res.json();
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
      if (!res.ok) {
        let errorMsg = 'Error de registro';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch(e) {
          errorMsg = `Error del servidor (${res.status})`;
        }
        return { data: { user: null, session: null }, error: new Error(errorMsg) };
      }
      const data = await res.json();
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
    // Mapear tabla 'profiles' a 'users', y 'service_emails' a 'service-emails'
    let route = tableName;
    if (tableName === 'profiles') {
      route = 'users';
    } else if (tableName === 'service_emails') {
      route = 'service-emails';
    }

    const state = {
      method: 'GET',
      body: null as any,
      filters: {} as Record<string, any>,
      isSingle: false
    };

    const chain: any = {
      select: (cols?: any) => {
        if (!['POST', 'PUT', 'DELETE'].includes(state.method)) {
          state.method = 'GET';
        }
        return chain;
      },
      insert: (vals: any) => {
        state.method = 'POST';
        // El SDK de Supabase a veces recibe arrays para insertar
        state.body = Array.isArray(vals) ? (vals.length === 1 ? vals[0] : vals) : vals;
        return chain;
      },
      update: (vals: any) => {
        state.method = 'PUT';
        state.body = vals;
        return chain;
      },
      delete: () => {
        state.method = 'DELETE';
        return chain;
      },
      eq: (col: string, val: any) => {
        state.filters[col] = val;
        return chain;
      },
      order: (col: any, options?: any) => {
        return chain;
      },
      single: () => {
        state.isSingle = true;
        return chain;
      },
      then: async (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
        try {
          const token = await appStorage.getItem('auth_token');
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          let url = `${API_URL}/api/${route}`;
          
          // Si es PUT o DELETE y tenemos un filtro de id, lo añadimos al path
          if ((state.method === 'PUT' || state.method === 'DELETE') && state.filters.id) {
            url += `/${state.filters.id}`;
          } else if (state.method === 'GET' && Object.keys(state.filters).length > 0) {
            // Opcionalmente agregar query params para GET si los hay
            const params = new URLSearchParams();
            Object.entries(state.filters).forEach(([k, v]) => params.append(k, String(v)));
            url += `?${params.toString()}`;
          }

          const fetchOptions: RequestInit = {
            method: state.method,
            headers
          };

          if (state.method !== 'GET' && state.method !== 'HEAD' && state.body) {
            fetchOptions.body = JSON.stringify(state.body);
          }

          const response = await fetch(url, fetchOptions);
          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error || `HTTP error ${response.status}`);
          }

          const data = await response.json();
          let finalData = data;
          
          // Si se solicitó single y la respuesta es un array, tomar el primer elemento
          if (state.isSingle && Array.isArray(data)) {
            finalData = data.length > 0 ? data[0] : null;
          } else if (!state.isSingle && !Array.isArray(data) && data && typeof data === 'object') {
            // El SDK de Supabase siempre retorna un array en insert/update sin .single()
            finalData = [data];
          }

          const result = { data: finalData, error: null };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        } catch (e: any) {
          const result = { data: null, error: e };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        }
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
