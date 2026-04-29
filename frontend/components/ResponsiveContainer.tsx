import React from 'react';
import { View, useWindowDimensions } from 'react-native';
export const ResponsiveContainer=({children,style}:any)=>{
 const {width}=useWindowDimensions();
 const max= width>1440?1280: width>1200?1100: width>900?920: width>700?720:'100%';
 const pad= width>1200?32: width>700?24:16;
 return <View style={[{width:'100%',maxWidth:max,alignSelf:'center',paddingHorizontal:pad},style]}>{children}</View>
};