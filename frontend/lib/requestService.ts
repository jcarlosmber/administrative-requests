import { appStorage, API_URL } from './supabase';

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
  metadata?: any;
}

type CreateRequestInput = Omit<AdministrativeRequest, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  status?: AdministrativeRequest['status'];
};

const getHeaders = async () => {
  const token = await appStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const requestService = {
  async getAll() {
    const res = await fetch(`${API_URL}/api/requests`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al obtener solicitudes');
    }
    return await res.json() as AdministrativeRequest[];
  },

  async getById(id: string) {
    const res = await fetch(`${API_URL}/api/requests`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al obtener la solicitud');
    }
    const data = await res.json() as AdministrativeRequest[];
    const request = data.find(r => r.id === id);
    if (!request) throw new Error('Solicitud no encontrada');
    return request;
  },

  async create(request: CreateRequestInput) {
    const res = await fetch(`${API_URL}/api/requests`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear solicitud');
    }
    return await res.json() as AdministrativeRequest;
  },

  async getRoomAvailability() {
    const res = await fetch(`${API_URL}/api/requests/rooms/availability`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al obtener disponibilidad de salas');
    }
    return await res.json() as { id: string; metadata: any; status: string }[];
  },

  async update(id: string, updates: Partial<AdministrativeRequest>) {
    const res = await fetch(`${API_URL}/api/requests/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar solicitud');
    }
    return await res.json() as AdministrativeRequest;
  },

  async addComment(id: string, text: string, author?: string) {
    const res = await fetch(`${API_URL}/api/requests/${id}/comment`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ text, author }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al agregar comentario');
    }
    return await res.json() as AdministrativeRequest;
  },

  async evaluateRequest(id: string, evaluation: { rating: number; comment?: string }) {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/requests/${id}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(evaluation)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to evaluate request');
    }
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch(`${API_URL}/api/requests/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al eliminar solicitud');
    }
  },

  async getAnalytics(startDate?: string, endDate?: string) {
    let url = `${API_URL}/api/requests`;
    const res = await fetch(url, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al obtener analíticas');
    }
    let data = await res.json() as any[];

    if (startDate) {
      const start = new Date(startDate).getTime();
      data = data.filter(d => new Date(d.created_at).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      data = data.filter(d => new Date(d.created_at).getTime() < end);
    }
    return data;
  }
};
