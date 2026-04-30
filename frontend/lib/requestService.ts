import { supabase } from './supabase';

export interface AdministrativeRequest {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  title: string;
  description: string;
  category: 'visitors' | 'maintenance' | 'parking' | 'transport' | 'rooms';
  status: 'pendiente' | 'en_progreso' | 'resuelto' | 'rechazado';
  priority: 'baja' | 'media' | 'alta';
  admin_notes?: string;
  attachments?: string[];
  metadata?: any; // Para campos específicos de cada módulo
}

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

  async create(request: Omit<AdministrativeRequest, 'id' | 'created_at' | 'updated_at' | 'status'>) {
    const { data, error } = await supabase
      .from('administrative_requests')
      .insert([request])
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
  }
};
