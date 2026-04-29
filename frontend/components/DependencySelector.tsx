import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export const DEPENDENCIES=['DESPACHO SECRETARÍA JURÍDICA','DIRECCIÓN DE GESTIÓN CORPORATIVA','DIRECCIÓN DISTRITAL DE DEFENSA JUDICIAL','OFICINA ASESORA DE PLANEACIÓN','OFICINA DE CONTROL INTERNO','OFICINA TIC','SUBSECRETARÍA JURÍDICA'];
export const DependencySelector=({visible,onClose,onSelect,selectedValue}:any)=>{
 const [q,setQ]=useState(''); const {width}=useWindowDimensions(); const desktop=width>900;
 const data=useMemo(()=>DEPENDENCIES.filter(x=>x.toLowerCase().includes(q.toLowerCase())),[q]);
 return <Modal visible={visible} transparent animationType='fade'>
 <View style={d.overlay}><View style={[d.sheet,desktop&&d.sheetDesk]}>
 <View style={d.head}><Text style={d.tt}>Seleccionar dependencia</Text><TouchableOpacity onPress={onClose}><Ionicons name='close' size={24} color='#0F172A'/></TouchableOpacity></View>
 <View style={d.search}><Ionicons name='search' size={18} color='#64748B'/><TextInput placeholder='Buscar...' value={q} onChangeText={setQ} style={d.input}/></View>
 <FlatList data={data} keyExtractor={i=>i} renderItem={({item})=><TouchableOpacity style={[d.row,selectedValue===item&&d.rowOn]} onPress={()=>{onSelect(item);onClose();}}><Text style={[d.tx,selectedValue===item&&d.txOn]}>{item}</Text>{selectedValue===item&&<Ionicons name='checkmark-circle' size={20} color='#A9301E'/>}</TouchableOpacity>} />
 </View></View></Modal>}
const d=StyleSheet.create({overlay:{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'flex-end'},sheet:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:'85%',padding:20},sheetDesk:{maxWidth:700,alignSelf:'center',width:'100%',borderRadius:28,marginBottom:30},head:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},tt:{fontSize:20,fontWeight:'900',color:'#0F172A'},search:{height:52,borderWidth:1,borderColor:'#E5EAF1',borderRadius:16,paddingHorizontal:14,alignItems:'center',flexDirection:'row',marginBottom:14},input:{flex:1,paddingLeft:10},row:{paddingVertical:16,borderBottomWidth:1,borderBottomColor:'#F1F5F9',flexDirection:'row',justifyContent:'space-between',gap:12},rowOn:{backgroundColor:'#FFF5F3'},tx:{flex:1,color:'#334155',fontWeight:'700'},txOn:{color:'#A9301E'}});
