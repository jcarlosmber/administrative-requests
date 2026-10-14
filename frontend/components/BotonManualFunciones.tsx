import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buscarManualCargo, ManualCargoInfo } from '../lib/manualesService';
import PdfViewerModal from './PdfViewerModal';

interface BotonManualFuncionesProps {
  id_sideap?: number | string | null;
  cargo?: string | null;
  codigo?: string | null;
  grado?: string | null;
  variante?: 'chip' | 'boton' | 'banner' | 'icono';
  etiqueta?: string;
  estiloContenedor?: any;
}

export default function BotonManualFunciones({
  id_sideap,
  cargo,
  codigo,
  grado,
  variante = 'boton',
  etiqueta,
  estiloContenedor,
}: BotonManualFuncionesProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const manual = buscarManualCargo({
    id_sideap,
    cargo,
    codigo,
    grado,
  });

  if (!manual) {
    return null;
  }

  const tituloVisual = etiqueta || 'Manual de Funciones';

  const abrirManual = () => {
    setModalVisible(true);
  };

  return (
    <>
      {variante === 'chip' && (
        <TouchableOpacity
          onPress={abrirManual}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: '#FEF3C7',
            borderColor: '#F59E0B',
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            cursor: 'pointer',
            ...estiloContenedor,
          }}
          accessibilityLabel={`Ver manual de funciones del cargo ${manual.cargo}`}
        >
          <Ionicons name="document-text" size={13} color="#B45309" />
          <Text
            style={{
              color: '#92400E',
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.2,
            }}
          >
            {tituloVisual}
          </Text>
          <View
            style={{
              backgroundColor: '#B45309',
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 3,
              marginLeft: 2,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>
              PDF
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {variante === 'boton' && (
        <TouchableOpacity
          onPress={abrirManual}
          activeOpacity={0.75}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: '#FFFBEB',
            borderColor: '#FCD34D',
            borderWidth: 1.2,
            paddingHorizontal: 12,
            paddingVertical: 6.5,
            borderRadius: 8,
            shadowColor: '#B45309',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 1,
            cursor: 'pointer',
            ...estiloContenedor,
          }}
          accessibilityLabel={`Ver manual de funciones del cargo ${manual.cargo}`}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              backgroundColor: '#DC2626',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="document-text" size={13} color="#FFFFFF" />
          </View>
          <View>
            <Text
              style={{
                color: '#78350F',
                fontSize: 11.5,
                fontWeight: '800',
                letterSpacing: 0.1,
              }}
            >
              {tituloVisual}
            </Text>
            <Text style={{ color: '#92400E', fontSize: 10, fontWeight: '500' }}>
              SIDEAP #{manual.id_sideap}
            </Text>
          </View>
          <Ionicons name="open-outline" size={14} color="#B45309" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      )}

      {variante === 'icono' && (
        <TouchableOpacity
          onPress={abrirManual}
          activeOpacity={0.7}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: '#FEF3C7',
            borderWidth: 1,
            borderColor: '#F59E0B',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            ...estiloContenedor,
          }}
          accessibilityLabel={`Ver manual de funciones en PDF del cargo ${manual.cargo}`}
        >
          <Ionicons name="document-text" size={15} color="#B45309" />
        </TouchableOpacity>
      )}

      {variante === 'banner' && (
        <View
          style={{
            backgroundColor: '#FFFDF5',
            borderRadius: 10,
            borderWidth: 1.2,
            borderColor: '#FCD34D',
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
            ...estiloContenedor,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 220 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#DC2626',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="document-text" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#78350F' }}>
                  Manual Específico de Funciones y Competencias
                </Text>
                <View
                  style={{
                    backgroundColor: '#FEF3C7',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#B45309' }}>
                    SIDEAP #{manual.id_sideap}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>
                {manual.cargo} • Código {manual.codigo} - Grado {manual.grado}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={abrirManual}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#B45309',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
              Ver Manual (PDF)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Visor de PDF */}
      <PdfViewerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        titulo={`Manual de Funciones: ${manual.cargo} (SIDEAP #${manual.id_sideap})`}
        nombreArchivo={manual.archivo}
        pdfUrl={manual.url}
      />
    </>
  );
}
