import { appStorage, API_URL } from './supabase';

export interface UserVehicle {
  id: string;
  user_id: string;
  plate: string;
  brand: string;
  model?: string;
  color?: string;
  name?: string;
  doc?: string;
  dependency?: string;
  created_at: string;
  updated_at: string;
}

const getHeaders = async () => {
  const token = await appStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const vehicleService = {
  async getAll() {
    const res = await fetch(`${API_URL}/api/vehicles`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al obtener vehículos');
    }
    return await res.json() as UserVehicle[];
  },

  async create(vehicle: Omit<UserVehicle, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const res = await fetch(`${API_URL}/api/vehicles`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(vehicle),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar vehículo');
    }
    return await res.json() as UserVehicle;
  },

  async update(id: string, updates: Partial<Omit<UserVehicle, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
    const res = await fetch(`${API_URL}/api/vehicles/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar vehículo');
    }
    return await res.json() as UserVehicle;
  },

  async delete(id: string) {
    const res = await fetch(`${API_URL}/api/vehicles/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al eliminar vehículo');
    }
  }
};
