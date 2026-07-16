import { appStorage, API_URL } from './supabase';

const getHeaders = async () => {
  const token = await appStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const chatbotService = {
  async sendMessage(message: string): Promise<string> {
    try {
      const res = await fetch(`${API_URL}/api/chatbot`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al comunicarse con el chatbot');
      }

      const data = await res.json();
      return data.reply;
    } catch (error: any) {
      console.error('ChatbotService error:', error);
      return 'Ocurrió un error al intentar conectarse. Por favor, intenta de nuevo más tarde.';
    }
  }
};
