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
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatbotService } from '../lib/chatbotService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  feedback?: 'up' | 'down';
  quickReplies?: string[];
}

interface ChatbotModalProps {
  visible: boolean;
  onClose: () => void;
}

const TypingIndicator = () => {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <Text style={{ marginLeft: 8, color: '#6b7280', fontSize: 14, fontStyle: 'italic' }}>Escribiendo{dots}</Text>;
};

const renderFormattedText = (text: string, isUser: boolean) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return (
    <Text style={{ color: isUser ? '#fff' : '#1f2937', fontSize: 15, lineHeight: 22 }}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <Text key={index} style={{ fontWeight: 'bold' }}>{part.slice(2, -2)}</Text>;
        } else if (part.startsWith('*') && part.endsWith('*')) {
          return <Text key={index} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

export const ChatbotModal: React.FC<ChatbotModalProps> = ({ visible, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      text: '¡Hola! Soy el asistente virtual. ¿En qué te puedo ayudar con tus solicitudes administrativas?', 
      isUser: false,
      timestamp: new Date(),
      quickReplies: ['Crear solicitud', 'Ver estado', 'Soporte']
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const suggestedQuestions = [
    "¿Cómo creo una nueva solicitud?",
    "¿Cuáles son los estados de una solicitud?",
    "¿Cómo veo el historial de mis solicitudes?",
    "¿Qué tipos de solicitudes puedo realizar?",
    "¿Cuánto tiempo tarda en aprobarse una solicitud?",
  ];

  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        translateY.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dy: translateY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        translateY.flattenOffset();
      },
    })
  ).current;

  // Cuando el modal general se cierra externamente, reiniciamos el estado minimizado
  useEffect(() => {
    if (!visible) {
      setIsMinimized(false);
      translateY.setValue(0);
    }
  }, [visible]);

  const handleClearChat = () => {
    setMessages([
      { 
        id: Date.now().toString(), 
        text: '¡Chat reiniciado! ¿En qué más puedo ayudarte hoy?', 
        isUser: false,
        timestamp: new Date(),
        quickReplies: ['Crear solicitud', 'Ver estado', 'Soporte']
      }
    ]);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => {
      const updatedPrev = prev.map(msg => ({ ...msg, quickReplies: undefined }));
      return [...updatedPrev, userMsg];
    });
    setInputText('');
    setIsLoading(true);

    try {
      const replyText = await chatbotService.sendMessage(userMsg.text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        isUser: false,
        timestamp: new Date(),
        quickReplies: replyText.toLowerCase().includes('solicitud') ? ['Aprobar', 'Rechazar', 'Más info'] : undefined
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, ocurrió un error al conectarse. Por favor intenta de nuevo.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, feedback: type } : msg));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={{ marginBottom: 16 }}>
      <View style={{
        alignSelf: item.isUser ? 'flex-end' : 'flex-start',
        backgroundColor: item.isUser ? '#3b82f6' : '#e5e7eb',
        padding: 12,
        borderRadius: 16,
        borderBottomRightRadius: item.isUser ? 4 : 16,
        borderBottomLeftRadius: item.isUser ? 16 : 4,
        maxWidth: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
      }}>
        {renderFormattedText(item.text, item.isUser)}
      </View>
      
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: item.isUser ? 'flex-end' : 'flex-start',
        marginTop: 4,
        paddingHorizontal: 4
      }}>
        {!item.isUser && (
          <View style={{ flexDirection: 'row', marginRight: 8, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => handleFeedback(item.id, 'up')} style={{ paddingHorizontal: 4 }}>
              <Ionicons name={item.feedback === 'up' ? "thumbs-up" : "thumbs-up-outline"} size={14} color={item.feedback === 'up' ? "#10b981" : "#9ca3af"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFeedback(item.id, 'down')} style={{ paddingHorizontal: 4 }}>
              <Ionicons name={item.feedback === 'down' ? "thumbs-down" : "thumbs-down-outline"} size={14} color={item.feedback === 'down' ? "#ef4444" : "#9ca3af"} />
            </TouchableOpacity>
          </View>
        )}
        <Text style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(item.timestamp)}</Text>
      </View>

      {!item.isUser && item.quickReplies && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {item.quickReplies.map((qr, idx) => (
            <TouchableOpacity 
              key={idx}
              onPress={() => handleSend(qr)}
              style={{
                backgroundColor: '#fff',
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 16,
                paddingVertical: 6,
                paddingHorizontal: 12,
                marginRight: 8
              }}
            >
              <Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: '500' }}>{qr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // Si está minimizado pero "visible" es true, mostramos solo la burbuja
  if (visible && isMinimized) {
    return (
      <Animated.View 
        style={{ 
          position: 'absolute', 
          bottom: 24, 
          right: 24, 
          zIndex: 9999,
          transform: [{ translateY }]
        }} 
        pointerEvents="box-none"
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          onPress={() => setIsMinimized(false)}
          style={{ backgroundColor: '#3b82f6', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 }}
        >
          <Ionicons name="chatbubbles" size={32} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Validamos si es visible para mostrar o no el Modal principal
  if (!visible) return null;

  return (
    <Modal
      visible={visible && !isMinimized}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.15)', justifyContent: 'flex-end', alignItems: 'flex-end', padding: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Fondo táctil para cerrar el chat o minimizarlo si tocan fuera */}
        <TouchableOpacity 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          activeOpacity={1}
          onPress={() => setIsMinimized(true)}
        />

        {/* Contenedor del Chat (Alineado inferior derecho, altura predeterminada) */}
        <View style={{ width: Platform.OS === 'web' || Dimensions.get('window').width > 500 ? 400 : '100%', height: 600, maxHeight: '85%', backgroundColor: '#f9fafb', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 }}>
          
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#eff6ff', padding: 8, borderRadius: 12 }}>
                <Ionicons name="chatbubbles" size={24} color="#3b82f6" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Asistente Virtual</Text>
                <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '500' }}>En línea</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={handleClearChat} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsMinimized(true)} style={{ padding: 8 }}>
                <Ionicons name="remove-outline" size={26} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <Ionicons name="close" size={26} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Chat List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            style={{ flex: 1 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Loading Indicator */}
          {isLoading && (
            <View style={{ padding: 16, alignItems: 'flex-start' }}>
              <View style={{
                backgroundColor: '#e5e7eb',
                padding: 12,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomLeftRadius: 4,
              }}>
                <ActivityIndicator size="small" color="#6b7280" />
                <TypingIndicator />
              </View>
            </View>
          )}

          {/* General Suggestions */}
          <View style={{ backgroundColor: '#fff', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {suggestedQuestions.map((q, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => handleSend(q)}
                  style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8, marginBottom: 8 }}
                >
                  <Text style={{ color: '#4b5563', fontSize: 13 }}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Input Area */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
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
                paddingTop: 12,
                paddingBottom: 12,
                fontSize: 15,
                maxHeight: 120,
                minHeight: 44,
                color: '#1f2937'
              }}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor="#9ca3af"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity 
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              style={{
                backgroundColor: inputText.trim() && !isLoading ? '#3b82f6' : '#e5e7eb',
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 12,
                marginBottom: 0
              }}
            >
              <Ionicons name="send" size={20} color={inputText.trim() && !isLoading ? "#fff" : "#9ca3af"} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
