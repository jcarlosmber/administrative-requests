import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FAQItem } from '../components/FAQItem';
import { faqData } from '../lib/faqData';

export default function FAQScreen() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={{ padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#111827',
          marginLeft: 12
        }}>
          Preguntas Frecuentes
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{
          fontSize: 16,
          color: '#4b5563',
          marginBottom: 20
        }}>
          Encuentra respuestas a las preguntas más comunes de nuestros usuarios.
        </Text>

        <View style={{ paddingBottom: 100 }}>
          {faqData.map((faq) => (
            <FAQItem key={faq.id} faq={faq} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
