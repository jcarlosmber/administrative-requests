import { appStorage, API_URL } from './supabase';

const getHeaders = async () => {
  const token = await appStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const chatbotService = {
  async sendMessage(message: string, retries = 2): Promise<string> {
    try {
      const res = await fetch(`${API_URL}/api/chatbot`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        let errorMsg = 'Error al comunicarse con el chatbot';
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch (e) {}
        
        const finalError = new Error(errorMsg);
        (finalError as any).status = res.status;
        throw finalError;
      }

      const data = await res.json();
      return data.reply;
    } catch (error: any) {
      if (retries > 0 && error.status !== 429) {
        console.warn(`ChatbotService falló, reintentando... (Quedan ${retries} intentos)`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Esperar 1.5s antes de reintentar
        return this.sendMessage(message, retries - 1);
      }
      console.error('ChatbotService error definitivo:', error);
      return error.message || 'Ocurrió un error al intentar conectarse. Por favor, intenta de nuevo más tarde.';
    }
  }
};
