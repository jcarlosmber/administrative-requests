import { supabase } from './supabase';
import { Platform } from 'react-native';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at?: string;
}

export interface ServiceEmail {
  id: string;
  service_type: 'maintenance' | 'visitors' | 'rooms_special' | 'parking';
  email: string;
  created_at?: string;
}

// Valores iniciales por defecto en caso de desconexión o primer inicio
const INITIAL_DRIVERS: Driver[] = [
  { id: '1', name: 'Carlos Mendoza', phone: '3104567890', is_active: true },
  { id: '2', name: 'Alfonso Guerrero', phone: '3157890123', is_active: true },
  { id: '3', name: 'Martha Lucia Gómez', phone: '3203456789', is_active: true }
];

const INITIAL_EMAILS: ServiceEmail[] = [
  { id: '1', service_type: 'maintenance', email: 'mantenimiento.sg@SJD.gov.co' },
  { id: '2', service_type: 'visitors', email: 'visitantes.sg@SJD.gov.co' },
  { id: '3', service_type: 'rooms_special', email: 'eventos.sg@SJD.gov.co' },
  { id: '4', service_type: 'parking', email: 'porteria.sg@SJD.gov.co' }
];

export const settingsService = {
  // ==========================================
  // SERVICIO DE CONDUCTORES (DRIVERS)
  // ==========================================
  async getDrivers(): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        if (Platform.OS === 'web') {
          localStorage.setItem('local_drivers', JSON.stringify(data));
        }
        return data as Driver[];
      }
    } catch (err) {
      console.warn('Usando respaldo local para conductores debido a error:', err);
    }

    // Fallback offline-first
    if (Platform.OS === 'web') {
      const local = localStorage.getItem('local_drivers');
      if (local) return JSON.parse(local);
      localStorage.setItem('local_drivers', JSON.stringify(INITIAL_DRIVERS));
    }
    return INITIAL_DRIVERS;
  },

  async createDriver(driver: Omit<Driver, 'id' | 'created_at'>): Promise<Driver> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert([driver])
        .select()
        .single();
      
      if (error) throw error;
      return data as Driver;
    } catch (err) {
      console.warn('Creando conductor local (offline):', err);
      const newDriver: Driver = {
        id: `temp-${Date.now()}`,
        ...driver
      };
      
      if (Platform.OS === 'web') {
        const drivers = await this.getDrivers();
        const updated = [...drivers, newDriver];
        localStorage.setItem('local_drivers', JSON.stringify(updated));
      }
      return newDriver;
    }
  },

  async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Driver;
    } catch (err) {
      console.warn('Actualizando conductor local (offline):', err);
      let updatedDriver: any = null;
      if (Platform.OS === 'web') {
        const drivers = await this.getDrivers();
        const updated = drivers.map(d => {
          if (d.id === id) {
            updatedDriver = { ...d, ...updates };
            return updatedDriver;
          }
          return d;
        });
        localStorage.setItem('local_drivers', JSON.stringify(updated));
      }
      return updatedDriver || { id, ...updates } as Driver;
    }
  },

  async deleteDriver(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.warn('Eliminando conductor local (offline):', err);
    } finally {
      if (Platform.OS === 'web') {
        const drivers = await this.getDrivers();
        const updated = drivers.filter(d => d.id !== id);
        localStorage.setItem('local_drivers', JSON.stringify(updated));
      }
    }
  },

  // ==========================================
  // SERVICIO DE CORREOS DE SERVICIOS (EMAILS)
  // ==========================================
  async getServiceEmails(): Promise<ServiceEmail[]> {
    try {
      const { data, error } = await supabase
        .from('service_emails')
        .select('*')
        .order('service_type');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        if (Platform.OS === 'web') {
          localStorage.setItem('local_service_emails', JSON.stringify(data));
        }
        return data as ServiceEmail[];
      }
    } catch (err) {
      console.warn('Usando respaldo local para correos debido a error:', err);
    }

    // Fallback offline-first
    if (Platform.OS === 'web') {
      const local = localStorage.getItem('local_service_emails');
      if (local) return JSON.parse(local);
      localStorage.setItem('local_service_emails', JSON.stringify(INITIAL_EMAILS));
    }
    return INITIAL_EMAILS;
  },

  async createServiceEmail(email: Omit<ServiceEmail, 'id' | 'created_at'>): Promise<ServiceEmail> {
    try {
      const { data, error } = await supabase
        .from('service_emails')
        .insert([email])
        .select()
        .single();
      
      if (error) throw error;
      return data as ServiceEmail;
    } catch (err) {
      console.warn('Creando correo local (offline):', err);
      const newEmail: ServiceEmail = {
        id: `temp-${Date.now()}`,
        ...email
      };
      
      if (Platform.OS === 'web') {
        const emails = await this.getServiceEmails();
        const updated = [...emails, newEmail];
        localStorage.setItem('local_service_emails', JSON.stringify(updated));
      }
      return newEmail;
    }
  },

  async deleteServiceEmail(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('service_emails')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.warn('Eliminando correo local (offline):', err);
    } finally {
      if (Platform.OS === 'web') {
        const emails = await this.getServiceEmails();
        const updated = emails.filter(e => e.id !== id);
        localStorage.setItem('local_service_emails', JSON.stringify(updated));
      }
    }
  }
};
