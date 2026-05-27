import { supabase } from './supabase';

export interface UserVehicle {
  id: string;
  user_id: string;
  plate: string;
  brand: string;
  model?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export const vehicleService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as UserVehicle[];
  },

  async create(vehicle: Omit<UserVehicle, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_vehicles')
      .insert([{ ...vehicle, user_id: user.id }])
      .select()
      .single();
    
    if (error) throw error;
    return data as UserVehicle;
  },

  async update(id: string, updates: Partial<Omit<UserVehicle, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
    const { data, error } = await supabase
      .from('user_vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as UserVehicle;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('user_vehicles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
