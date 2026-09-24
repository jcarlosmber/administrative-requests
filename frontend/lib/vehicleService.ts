import { appStorage, API_URL } from './supabase';

export interface UserVehicle {
  id: string;
  user_id?: string;
  plate: string;
  brand: string;
  model?: string;
  color?: string;
  name?: string;
  doc?: string;
  dependency?: string;
  is_active?: boolean;
  assigned_spot_id?: string | null;
  spot_code?: string | null;
  spot_type?: 'fija' | 'libre' | string | null;
  spot_status?: 'disponible' | 'ocupada' | 'mantenimiento' | 'reservada' | string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ParkingSpot {
  id: string;
  code: string;
  spot_type: 'fija' | 'libre';
  status: 'disponible' | 'ocupada' | 'mantenimiento' | 'reservada';
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  assigned_user_name_resolved?: string | null;
  assigned_user_email?: string | null;
  assigned_user_dependency?: string | null;
  notes?: string | null;
  assigned_vehicles?: UserVehicle[];
  active_vehicles_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleHistory {
  id: string;
  vehicle_id?: string;
  plate: string;
  action: string;
  performed_by?: string;
  performed_by_id?: string;
  performed_by_name?: string;
  details?: any;
  created_at: string;
}

export interface ParkingStats {
  totalSpots: number;
  availableSpots: number;
  occupiedSpots: number;
  maintenanceSpots: number;
  fixedSpots: number;
  freeSpots: number;
  activeVehicles: number;
  vehiclesWithFixedSpot: number;
  vehiclesFreeUse: number;
}

export interface UserVehiclesSummary {
  vehicles: UserVehicle[];
  count: number;
  activeCount: number;
  maxLimit: number;
}

const getHeaders = async () => {
  const token = await appStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const vehicleService = {
  // ===============================
  // GESTIÓN DE VEHÍCULOS
  // ===============================

  async getAll(params?: { all?: boolean; userId?: string; doc?: string; plate?: string }): Promise<UserVehicle[]> {
    const query = new URLSearchParams();
    if (params?.all) query.append('all', 'true');
    if (params?.userId) query.append('userId', params.userId);
    if (params?.doc) query.append('doc', params.doc);
    if (params?.plate) query.append('plate', params.plate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_URL}/api/vehicles${queryString}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener vehículos');
    }
    return await res.json() as UserVehicle[];
  },

  async getByUser(identifier: string): Promise<UserVehiclesSummary> {
    const res = await fetch(`${API_URL}/api/vehicles/by-user/${encodeURIComponent(identifier)}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener vehículos del usuario');
    }
    return await res.json() as UserVehiclesSummary;
  },

  async create(vehicle: {
    plate: string;
    brand: string;
    model?: string;
    color?: string;
    name?: string;
    doc?: string;
    dependency?: string;
    notes?: string;
    target_user_id?: string;
  }): Promise<UserVehicle> {
    const res = await fetch(`${API_URL}/api/vehicles`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(vehicle),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar vehículo');
    }
    return await res.json() as UserVehicle;
  },

  async update(id: string, updates: Partial<UserVehicle>): Promise<UserVehicle> {
    const res = await fetch(`${API_URL}/api/vehicles/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar vehículo');
    }
    return await res.json() as UserVehicle;
  },

  async toggleActive(id: string, isActive: boolean): Promise<UserVehicle> {
    return this.update(id, { is_active: isActive });
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/vehicles/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar vehículo');
    }
  },

  async getVehicleHistory(vehicleId: string): Promise<VehicleHistory[]> {
    const res = await fetch(`${API_URL}/api/vehicles/${vehicleId}/history`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al consultar historial del vehículo');
    }
    return await res.json() as VehicleHistory[];
  },

  async getGlobalHistory(): Promise<VehicleHistory[]> {
    const res = await fetch(`${API_URL}/api/vehicles/history`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al consultar historial de auditoría');
    }
    return await res.json() as VehicleHistory[];
  },

  // ===============================
  // GESTIÓN DE CELDAS DE PARQUEADERO
  // ===============================

  async getSpots(): Promise<ParkingSpot[]> {
    const res = await fetch(`${API_URL}/api/parking-spots`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener celdas');
    }
    return await res.json() as ParkingSpot[];
  },

  async createSpot(spot: {
    code: string;
    spot_type: 'fija' | 'libre';
    status?: 'disponible' | 'ocupada' | 'mantenimiento' | 'reservada';
    assigned_user_id?: string | null;
    assigned_user_name?: string | null;
    notes?: string | null;
  }): Promise<ParkingSpot> {
    const res = await fetch(`${API_URL}/api/parking-spots`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(spot),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear celda de parqueadero');
    }
    return await res.json() as ParkingSpot;
  },

  async updateSpot(id: string, updates: Partial<ParkingSpot>): Promise<ParkingSpot> {
    const res = await fetch(`${API_URL}/api/parking-spots/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar celda');
    }
    return await res.json() as ParkingSpot;
  },

  async deleteSpot(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/parking-spots/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar celda');
    }
  },

  async assignSpot(spotId: string, payload: {
    vehicle_id?: string;
    user_id?: string;
    user_name?: string;
    notes?: string;
  }): Promise<ParkingSpot> {
    const res = await fetch(`${API_URL}/api/parking-spots/${spotId}/assign`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al asignar la celda');
    }
    return await res.json() as ParkingSpot;
  },

  async releaseSpot(spotId: string, payload?: { vehicle_id?: string }): Promise<void> {
    const res = await fetch(`${API_URL}/api/parking-spots/${spotId}/release`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al liberar la celda');
    }
  },

  async getStats(): Promise<ParkingStats> {
    const res = await fetch(`${API_URL}/api/parking-spots/stats`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener estadísticas de celdas');
    }
    return await res.json() as ParkingStats;
  },

  // ===============================
  // CONFIGURACIÓN DE LÍMITES
  // ===============================

  async getMaxLimit(): Promise<number> {
    try {
      const res = await fetch(`${API_URL}/api/settings/max_vehicles_per_user`, {
        headers: await getHeaders(),
      });
      if (res.ok) {
        const val = await res.json();
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 3 : parsed;
      }
    } catch (_) {}
    return 3;
  },

  async setMaxLimit(limit: number): Promise<void> {
    const res = await fetch(`${API_URL}/api/system-settings/max_vehicles_per_user`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ value: limit }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar límite de vehículos');
    }
  }
};
