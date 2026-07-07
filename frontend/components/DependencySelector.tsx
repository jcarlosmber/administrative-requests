import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export const INITIAL_DEPENDENCIES = [
  'Secretaría Jurídica Distrital',
  'Dirección de Gestión Corporativa',
  'Dirección Distrital de Defensa Judicial',
  'Subdirección de Informática (Oficina TIC)',
  'Oficina Asesora de Planeación',
  'Oficina de Control Interno',
  'Subsecretaría Jurídica',
  'Dirección Distrital de Asuntos Penales'
];

export const DEPENDENCIES = INITIAL_DEPENDENCIES;

const safeStorage = {
  getItem: async (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  }
};

export const DependencySelector = ({ visible, onClose, onSelect, selectedValue }: any) => {
  const [q, setQ] = useState('');
  const [deps, setDeps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const desktop = width > 900;

  useEffect(() => {
    if (!visible) return;

    const loadDeps = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('dependencies')
          .select('name')
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          setDeps(data.map((x: any) => x.name));
        } else {
          // Fallback a localStorage
          const local = await safeStorage.getItem('local_dependencies');
          if (local) {
            const parsed = JSON.parse(local);
            setDeps(parsed.map((d: any) => d.name));
          } else {
            setDeps(INITIAL_DEPENDENCIES);
          }
        }
      } catch (err) {
        console.warn('Fallback al cargar dependencias:', err);
        const local = await safeStorage.getItem('local_dependencies');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setDeps(parsed.map((d: any) => d.name));
          } catch {
            setDeps(INITIAL_DEPENDENCIES);
          }
        } else {
          setDeps(INITIAL_DEPENDENCIES);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDeps();
  }, [visible]);

  const data = useMemo(() => deps.filter(x => x.toLowerCase().includes(q.toLowerCase())), [deps, q]);

  return (
    <Modal visible={visible} transparent animationType='fade'>
      <View style={d.overlay}>
        <View style={[d.sheet, desktop && d.sheetDesk]}>
          <View style={d.head}>
            <Text style={d.tt}>Seleccionar dependencia</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name='close' size={24} color='#0F172A' />
            </TouchableOpacity>
          </View>
          
          <View style={d.search}>
            <Ionicons name='search' size={18} color='#64748B' />
            <TextInput 
              placeholder='Buscar...' 
              value={q} 
              onChangeText={setQ} 
              style={d.input} 
            />
          </View>

          {loading ? (
            <View style={{ padding: 40, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#A9301E" />
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 10, fontWeight: '600' }}>Cargando dependencias...</Text>
            </View>
          ) : (
            <FlatList 
              data={data} 
              keyExtractor={i => i} 
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[d.row, selectedValue === item && d.rowOn]} 
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={[d.tx, selectedValue === item && d.txOn]}>{item}</Text>
                  {selectedValue === item && <Ionicons name='checkmark-circle' size={20} color='#A9301E' />}
                </TouchableOpacity>
              )} 
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const d = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', padding: 20 },
  sheetDesk: { maxWidth: 700, alignSelf: 'center', width: '100%', borderRadius: 28, marginBottom: 30 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tt: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  search: { height: 52, borderWidth: 1, borderColor: '#E5EAF1', borderRadius: 16, paddingHorizontal: 14, alignItems: 'center', flexDirection: 'row', marginBottom: 14 },
  input: { flex: 1, paddingLeft: 10 },
  row: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowOn: { backgroundColor: '#FFF5F3' },
  tx: { flex: 1, color: '#334155', fontWeight: '700' },
  txOn: { color: '#A9301E' }
});

