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
  charge?: string | null;
  vehicle_type?: 'carro' | 'moto' | string;
  is_active?: boolean;
  approval_status?: 'pendiente' | 'aprobado' | 'rechazado' | string | null;
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
  vehicle_type?: 'carro' | 'moto' | 'mixto' | string;
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

export function getVehicleType(veh?: Partial<UserVehicle> | null): 'carro' | 'moto' {
  if (!veh) return 'carro';
  if (veh.vehicle_type === 'moto' || veh.vehicle_type === 'carro') {
    return veh.vehicle_type;
  }
  const cleanPlate = (veh.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (/^[A-Z]{3}[0-9]{2}[A-Z]$/.test(cleanPlate)) {
    return 'moto';
  }
  const text = `${veh.brand || ''} ${veh.model || ''} ${veh.notes || ''}`.toLowerCase();
  if (text.includes('moto') || text.includes('yamaha') || text.includes('suzuki') || text.includes('honda') || text.includes('victory') || text.includes('pulsar') || text.includes('ktm') || text.includes('bajaj') || text.includes('kawasaki')) {
    return 'moto';
  }
  return 'carro';
}

export function getSpotVehicleType(spot?: Partial<ParkingSpot> | null): 'carro' | 'moto' | 'mixto' {
  if (!spot) return 'carro';
  if (spot.vehicle_type === 'moto' || spot.vehicle_type === 'carro' || spot.vehicle_type === 'mixto') {
    return spot.vehicle_type;
  }
  if ((spot.code || '').toUpperCase().startsWith('M-') || (spot.notes || '').toLowerCase().includes('moto')) {
    return 'moto';
  }
  return 'carro';
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

export function formatVehicleHistoryAction(action?: string): string {
  if (!action) return 'MODIFICACIÓN';
  const act = action.toLowerCase().trim();
  if (act.includes('creacion') || act.includes('registro')) return 'CREACIÓN';
  if (act.includes('edicion') || act.includes('actualizacion') || act.includes('update')) return 'EDICIÓN';
  if (act.includes('activacion') && !act.includes('inact')) return 'ACTIVACIÓN';
  if (act.includes('inactivacion')) return 'INACTIVACIÓN';
  if (act.includes('eliminacion') || act.includes('borrado')) return 'ELIMINACIÓN';
  if (act.includes('asignacion_celda_fija') || act.includes('asignacion_celda') || act.includes('cambio_celda')) return 'CAMBIO CELDA';
  if (act.includes('desasignacion') || act.includes('liberacion_celda')) return 'LIBERACIÓN CELDA';
  if (act.includes('bloqueo')) return 'BLOQUEO ACCESO';
  return action.toUpperCase();
}

export function formatVehicleHistoryDetails(details: any): string {
  if (!details) return '';
  let parsed = details;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return parsed;
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return String(parsed);
  }

  // Caso con { previous, updated }
  if (parsed.previous || parsed.updated) {
    const changes: string[] = [];
    const prev = parsed.previous || {};
    const upd = parsed.updated || {};

    if (prev.plate && upd.plate && prev.plate !== upd.plate) {
      changes.push(`Placa: ${prev.plate} ➔ ${upd.plate}`);
    }
    if (prev.is_active !== undefined && upd.is_active !== undefined && prev.is_active !== upd.is_active) {
      changes.push(`Estado: ${prev.is_active ? 'Activo' : 'Inactivo'} ➔ ${upd.is_active ? 'Activo' : 'Inactivo'}`);
    }
    if (prev.assigned_spot_id !== upd.assigned_spot_id) {
      if (!prev.assigned_spot_id && upd.assigned_spot_id) {
        changes.push('Celda asignada');
      } else if (prev.assigned_spot_id && !upd.assigned_spot_id) {
        changes.push('Celda liberada');
      } else {
        changes.push('Celda reasignada');
      }
    }

    if (changes.length > 0) {
      return changes.join(' • ');
    }
    return 'Actualización general de datos';
  }

  // Si tiene razón o motivo
  if (parsed.reason) {
    return String(parsed.reason);
  }

  // Caso asignación celda
  if (parsed.spot_number) {
    return `Celda N° ${parsed.spot_number}`;
  }

  // Caso creación o detalles de vehículo
  if (parsed.brand || parsed.model || parsed.vehicle_type) {
    const parts = [parsed.brand, parsed.model, parsed.color].filter(Boolean).join(' ');
    const tipo = parsed.vehicle_type ? `Tipo: ${parsed.vehicle_type}` : '';
    return [tipo, parts].filter(Boolean).join(' - ') || 'Vehículo registrado';
  }

  // Fallback si es cualquier otro objeto
  try {
    const entries = Object.entries(parsed).filter(([_, v]) => v !== null && v !== undefined && typeof v !== 'object');
    if (entries.length > 0) {
      return entries.map(([k, v]) => `${k}: ${v}`).join(' • ');
    }
    return JSON.stringify(parsed);
  } catch {
    return '';
  }
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
  isUnlimited?: boolean;
  employmentType?: 'directivo' | 'funcionario_asesor' | 'contratista' | string;
  employmentLabel?: string;
  canRegister?: boolean;
  reason?: string;
  charge?: string;
}

export type UserEmploymentType = 'directivo' | 'funcionario_asesor' | 'contratista';

export function resolveVehicleLimitByCharge(chargeOrRole?: string | null): {
  type: UserEmploymentType;
  label: string;
  maxLimit: number; // 999 para ilimitado, 1 para funcionario/asesor, 0 para contratista
  isUnlimited: boolean;
  canRegister: boolean;
  reason?: string;
} {
  const text = (chargeOrRole || '').toLowerCase().trim();

  // 1. Contratistas: 0 vehículos
  if (
    text.includes('contratista') ||
    text.includes('prestacion de servicios') ||
    text.includes('prestación de servicios') ||
    text.includes('apoyo a la gestion') ||
    text.includes('apoyo a la gestión') ||
    text.includes('ops') ||
    text.includes('honorarios')
  ) {
    return {
      type: 'contratista',
      label: 'Contratista',
      maxLimit: 0,
      isUnlimited: false,
      canRegister: false,
      reason: 'Según los lineamientos institucionales, el parqueadero permanente no está habilitado para personal contratista.'
    };
  }

  // 2. Directivos: sin límite (Directores, Secretarios, Subsecretarios, etc.)
  if (
    text.includes('director') ||
    text.includes('directora') ||
    text.includes('secretario') ||
    text.includes('secretaria') ||
    text.includes('subsecretario') ||
    text.includes('subsecretaria') ||
    text.includes('directivo') ||
    text.includes('jefe') ||
    text.includes('alcalde') ||
    text.includes('ministro')
  ) {
    return {
      type: 'directivo',
      label: 'Directivo',
      maxLimit: 999,
      isUnlimited: true,
      canRegister: true
    };
  }

  // 3. Funcionarios y Asesores de planta: 1 vehículo
  return {
    type: 'funcionario_asesor',
    label: text.includes('asesor') ? 'Asesor' : 'Funcionario',
    maxLimit: 1,
    isUnlimited: false,
    canRegister: true
  };
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
    charge?: string;
    notes?: string;
    target_user_id?: string;
    vehicle_type?: 'carro' | 'moto' | string;
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
    const headers = await getHeaders();
    let res = await fetch(`${API_URL}/api/vehicles/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      let fallbackRes = await fetch(`${API_URL}/api/vehicles/${id}/update`, {
        method: 'POST',
        headers: { ...headers, 'X-HTTP-Method-Override': 'PUT' },
        body: JSON.stringify(updates),
      }).catch(() => null);

      if (!fallbackRes || !fallbackRes.ok) {
        const basePost = await fetch(`${API_URL}/api/vehicles/${id}`, {
          method: 'POST',
          headers: { ...headers, 'X-HTTP-Method-Override': 'PUT' },
          body: JSON.stringify(updates),
        }).catch(() => null);
        if (basePost && basePost.ok) {
          fallbackRes = basePost;
        }
      }

      if (fallbackRes && fallbackRes.ok) {
        res = fallbackRes;
      }
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al actualizar vehículo');
    }
    return await res.json() as UserVehicle;
  },

  async toggleActive(id: string, isActive: boolean): Promise<UserVehicle> {
    return this.update(id, { is_active: isActive });
  },

  async delete(id: string): Promise<void> {
    const headers = await getHeaders();
    let res = await fetch(`${API_URL}/api/vehicles/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      // 1. Probar POST a la misma URL con X-HTTP-Method-Override (compatibilidad con Express middleware)
      let fallbackRes = await fetch(`${API_URL}/api/vehicles/${id}`, {
        method: 'POST',
        headers: { ...headers, 'X-HTTP-Method-Override': 'DELETE' },
      }).catch(() => null);

      // 2. Si falla o da 404/405, probar endpoint dedicado /delete
      if (!fallbackRes || !fallbackRes.ok) {
        const dedicatedRes = await fetch(`${API_URL}/api/vehicles/${id}/delete`, {
          method: 'POST',
          headers: { ...headers, 'X-HTTP-Method-Override': 'DELETE' },
        }).catch(() => null);

        if (dedicatedRes && dedicatedRes.ok) {
          fallbackRes = dedicatedRes;
        }
      }

      if (fallbackRes && fallbackRes.ok) {
        res = fallbackRes;
      }
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al eliminar vehículo');
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
    vehicle_type?: 'carro' | 'moto' | 'mixto' | string;
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
    const headers = await getHeaders();
    let res = await fetch(`${API_URL}/api/parking-spots/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const fallbackRes = await fetch(`${API_URL}/api/parking-spots/${id}/update`, {
        method: 'POST',
        headers: { ...headers, 'X-HTTP-Method-Override': 'PUT' },
        body: JSON.stringify(updates),
      }).catch(() => null);

      if (fallbackRes && fallbackRes.ok) {
        res = fallbackRes;
      } else {
        const postDirectRes = await fetch(`${API_URL}/api/parking-spots/${id}`, {
          method: 'POST',
          headers: { ...headers, 'X-HTTP-Method-Override': 'PUT' },
          body: JSON.stringify(updates),
        }).catch(() => null);
        if (postDirectRes && postDirectRes.ok) {
          res = postDirectRes;
        }
      }
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al actualizar celda');
    }
    return await res.json() as ParkingSpot;
  },

  async deleteSpot(id: string): Promise<void> {
    const headers = await getHeaders();
    let res = await fetch(`${API_URL}/api/parking-spots/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      // 1. Probar POST a la misma URL con X-HTTP-Method-Override
      let fallbackRes = await fetch(`${API_URL}/api/parking-spots/${id}`, {
        method: 'POST',
        headers: { ...headers, 'X-HTTP-Method-Override': 'DELETE' },
      }).catch(() => null);

      // 2. Si falla, probar con /delete
      if (!fallbackRes || !fallbackRes.ok) {
        const dedicatedRes = await fetch(`${API_URL}/api/parking-spots/${id}/delete`, {
          method: 'POST',
          headers: { ...headers, 'X-HTTP-Method-Override': 'DELETE' },
        }).catch(() => null);

        if (dedicatedRes && dedicatedRes.ok) {
          fallbackRes = dedicatedRes;
        }
      }

      if (fallbackRes && fallbackRes.ok) {
        res = fallbackRes;
      }
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al eliminar celda');
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
