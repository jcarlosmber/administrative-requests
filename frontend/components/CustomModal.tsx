import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const CustomModal = ({visible,title,message,onClose,type='info'}:any) => {
 const icon = type==='success'?'checkmark-circle':type==='error'?'alert-circle':'information-circle';
 const color = type==='success'?'#16A34A':type==='error'?'#A9301E':'#2563EB';
 return (
 <Modal transparent visible={visible} animationType='fade'>
  <View style={s.overlay}>
   <View style={s.modal}>
    <View style={[s.iconWrap,{backgroundColor:color}]}><Ionicons name={icon as any} size={34} color='#fff'/></View>
    <Text style={s.title}>{title}</Text>
    <Text style={s.msg}>{message}</Text>
    <TouchableOpacity onPress={onClose} style={s.btn}>
      <LinearGradient colors={[color,color]} style={s.btnFill}><Text style={s.btnText}>Aceptar</Text></LinearGradient>
    </TouchableOpacity>
   </View>
  </View>
 </Modal>) }

const s=StyleSheet.create({overlay:{flex:1,backgroundColor:'rgba(15,23,42,.65)',justifyContent:'center',alignItems:'center',padding:20},modal:{width:'100%',maxWidth:420,backgroundColor:'#fff',borderRadius:28,padding:28,alignItems:'center',shadowColor:'#000',shadowOpacity:.18,shadowRadius:30,shadowOffset:{width:0,height:12},elevation:8},iconWrap:{width:72,height:72,borderRadius:24,justifyContent:'center',alignItems:'center',marginBottom:18},title:{fontSize:24,fontWeight:'900',color:'#0F172A'},msg:{marginTop:10,fontSize:15,lineHeight:24,color:'#64748B',textAlign:'center'},btn:{width:'100%',marginTop:24,borderRadius:18,overflow:'hidden'},btnFill:{height:56,justifyContent:'center',alignItems:'center'},btnText:{color:'#fff',fontSize:16,fontWeight:'900'}});
