import React, { useState, useRef, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatbotService } from '../lib/chatbotService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

interface ChatbotModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ChatbotModal: React.FC<ChatbotModalProps> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: '¡Hola! Soy el asistente virtual. ¿En qué te puedo ayudar con tus solicitudes administrativas?', isUser: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const replyText = await chatbotService.sendMessage(userMsg.text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        isUser: false,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, ocurrió un error al conectarse. Por favor intenta de nuevo.',
        isUser: false,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={{
      alignSelf: item.isUser ? 'flex-end' : 'flex-start',
      backgroundColor: item.isUser ? '#3b82f6' : '#e5e7eb',
      padding: 12,
      borderRadius: 16,
      borderBottomRightRadius: item.isUser ? 4 : 16,
      borderBottomLeftRadius: item.isUser ? 16 : 4,
      maxWidth: '80%',
      marginBottom: 12,
    }}>
      <Text style={{
        color: item.isUser ? '#fff' : '#1f2937',
        fontSize: 15,
      }}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: '#f9fafb' }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          marginTop: Platform.OS === 'ios' ? 40 : 0
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chatbubbles" size={24} color="#3b82f6" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 8, color: '#111827' }}>
              Asistente Virtual
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Chat List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          style={{ flex: 1 }}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={{ padding: 8, alignItems: 'flex-start', marginLeft: 16 }}>
            <View style={{
              backgroundColor: '#e5e7eb',
              padding: 12,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <ActivityIndicator size="small" color="#6b7280" />
              <Text style={{ marginLeft: 8, color: '#6b7280', fontSize: 14 }}>Escribiendo...</Text>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: '#f3f4f6',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              maxHeight: 100,
            }}
            placeholder="Escribe tu mensaje..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity 
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            style={{
              backgroundColor: inputText.trim() && !isLoading ? '#3b82f6' : '#9ca3af',
              width: 44,
              height: 44,
              borderRadius: 22,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 8,
            }}
          >
            <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
