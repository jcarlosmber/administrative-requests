import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FAQ } from '../lib/faqData';
import { Ionicons } from '@expo/vector-icons';

interface FAQItemProps {
  faq: FAQ;
}

export const FAQItem: React.FC<FAQItemProps> = ({ faq }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      overflow: 'hidden',
    }}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={{
          padding: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: expanded ? '#f9fafb' : '#fff'
        }}
        activeOpacity={0.7}
      >
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#111827',
          flex: 1,
          marginRight: 12
        }}>
          {faq.question}
        </Text>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#6b7280" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={{
          padding: 16,
          paddingTop: 0,
          backgroundColor: '#f9fafb',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6'
        }}>
          <Text style={{
            fontSize: 14,
            color: '#4b5563',
            lineHeight: 20
          }}>
            {faq.answer}
          </Text>
        </View>
      )}
    </View>
  );
};
