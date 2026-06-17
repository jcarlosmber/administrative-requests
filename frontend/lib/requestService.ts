import { supabase } from './supabase';

export interface AdministrativeRequest {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  title: string;
  description: string;
  category: 'visitors' | 'maintenance' | 'parking' | 'transport' | 'rooms';
  status: 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado';
  priority: 'baja' | 'media' | 'alta';
  admin_notes?: string;
  attachments?: string[];
  metadata?: any; // Para campos específicos de cada módulo
}

type CreateRequestInput = Omit<AdministrativeRequest, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  status?: AdministrativeRequest['status'];
};

const defaultCreatePayload = (request: CreateRequestInput): CreateRequestInput => ({
  ...request,
  status: request.status || 'pendiente'
});

export const requestService = {
  async getAll() {
    const { data, error } = await supabase
      .from('administrative_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as AdministrativeRequest[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('administrative_requests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as AdministrativeRequest;
  },

  async create(request: CreateRequestInput) {
    const payload = defaultCreatePayload(request);
    const { data, error } = await supabase
      .from('administrative_requests')
      .insert([payload])
      .select()
      .single();
    
    if (error) throw error;
    return data as AdministrativeRequest;
  },

  async update(id: string, updates: Partial<AdministrativeRequest>) {
    const { data, error } = await supabase
      .from('administrative_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as AdministrativeRequest;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('administrative_requests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getAnalytics(startDate?: string, endDate?: string) {
    // Usar una consulta directa evita errores 400 de PostgREST cuando la BD no tiene
    // configurada la relación embebida `administrative_requests.user_id -> profiles.id`.
    // Los reportes toman los datos operativos desde `administrative_requests.metadata`.
    let query = supabase
      .from('administrative_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lt('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as any[];
  }
};
