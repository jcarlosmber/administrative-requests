import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ColumnConfig<T> {
  id: string;
  label: string;
  width: string | number; // e.g. '15%' o 180
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  getSortValue?: (item: T) => string | number | null | undefined;
  render: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  onRowPress?: (item: T) => void;
  minTableWidth?: number;
  emptyMessage?: string;
  permitirMoverColumnas?: boolean;
  enableColumnReorder?: boolean;
  permitirOrdenar?: boolean;
  enableSorting?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  rowHeight?: number;
  tituloTabla?: string;
}

export function DataTable<T>({
  data,
  columns: initialColumns,
  keyExtractor,
  onRowPress,
  minTableWidth = 1200,
  emptyMessage = 'No se encontraron registros para mostrar',
  permitirMoverColumnas,
  enableColumnReorder,
  permitirOrdenar,
  enableSorting,
  containerStyle,
  tituloTabla,
}: DataTableProps<T>) {
  // Aliases para soportar tanto español como inglés
  const puedeMoverColumnas = enableColumnReorder ?? permitirMoverColumnas ?? true;
  const puedeOrdenar = enableSorting ?? permitirOrdenar ?? true;
  // Orden y visibilidad de las columnas
  const [columnas, setColumnas] = useState<ColumnConfig<T>[]>(initialColumns);
  const [modalColumnasVisible, setModalColumnasVisible] = useState(false);

  // Estado de ordenación
  const [columnaOrdenada, setColumnaOrdenada] = useState<string | null>(null);
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc' | null>(null);

  // Ancho del contenedor medido
  const [anchoContenedor, setAnchoContenedor] = useState<number>(0);

  // Sincronizar si cambian las columnas iniciales
  React.useEffect(() => {
    setColumnas((prevCols) => {
      // Conservar el orden si las columnas ya existen
      const colMap = new Map(initialColumns.map((c) => [c.id, c]));
      const existentes = prevCols
        .map((c) => colMap.get(c.id))
        .filter((c): c is ColumnConfig<T> => Boolean(c));
      const nuevas = initialColumns.filter((c) => !prevCols.some((p) => p.id === c.id));
      return [...existentes, ...nuevas];
    });
  }, [initialColumns]);

  // Manejador para ordenar al hacer clic en el encabezado
  const manejarClickCabecera = (col: ColumnConfig<T>) => {
    if (!permitirOrdenar || !col.sortable) return;

    if (columnaOrdenada === col.id) {
      if (direccionOrden === 'asc') {
        setDireccionOrden('desc');
      } else if (direccionOrden === 'desc') {
        // Restablecer orden
        setColumnaOrdenada(null);
        setDireccionOrden(null);
      }
    } else {
      setColumnaOrdenada(col.id);
      setDireccionOrden('asc');
    }
  };

  // Mover columna a la izquierda
  const moverColumnaIzquierda = (index: number) => {
    if (index <= 0) return;
    setColumnas((prev) => {
      const copia = [...prev];
      const temp = copia[index];
      copia[index] = copia[index - 1];
      copia[index - 1] = temp;
      return copia;
    });
  };

  // Mover columna a la derecha
  const moverColumnaDerecha = (index: number) => {
    if (index >= columnas.length - 1) return;
    setColumnas((prev) => {
      const copia = [...prev];
      const temp = copia[index];
      copia[index] = copia[index + 1];
      copia[index + 1] = temp;
      return copia;
    });
  };

  // Restablecer columnas al orden original
  const restablecerOrdenColumnas = () => {
    setColumnas([...initialColumns]);
    setColumnaOrdenada(null);
    setDireccionOrden(null);
    setModalColumnasVisible(false);
  };

  // Datos ordenados alfanuméricamente
  const datosProcesados = useMemo(() => {
    if (!columnaOrdenada || !direccionOrden) {
      return data;
    }

    const col = columnas.find((c) => c.id === columnaOrdenada);
    if (!col || !col.getSortValue) {
      return data;
    }

    const getter = col.getSortValue;
    return [...data].sort((itemA, itemB) => {
      const valA = getter(itemA);
      const valB = getter(itemB);

      if (valA == null && valB == null) return 0;
      if (valA == null) return direccionOrden === 'asc' ? 1 : -1;
      if (valB == null) return direccionOrden === 'asc' ? -1 : 1;

      // Si ambos son números
      if (typeof valA === 'number' && typeof valB === 'number') {
        return direccionOrden === 'asc' ? valA - valB : valB - valA;
      }

      // Ordenación alfanumérica natural (con numeric: true para que "Plaza 2" vaya antes de "Plaza 10")
      const strA = String(valA).trim();
      const strB = String(valB).trim();
      const resultado = strA.localeCompare(strB, 'es', {
        numeric: true,
        sensitivity: 'base',
      });

      return direccionOrden === 'asc' ? resultado : -resultado;
    });
  }, [data, columnaOrdenada, direccionOrden, columnas]);

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - anchoContenedor) > 5) {
          setAnchoContenedor(w);
        }
      }}
      style={[
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          width: '100%',
        },
        containerStyle,
      ]}
    >
      {/* Barra de herramientas de la tabla (Personalizar Columnas y Orden activo) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#F8FAFC',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {tituloTabla ? (
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
              {tituloTabla}
            </Text>
          ) : null}

          {columnaOrdenada ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
              }}
            >
              <Ionicons
                name={direccionOrden === 'asc' ? 'arrow-up' : 'arrow-down'}
                size={13}
                color="#1D4ED8"
              />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#1E40AF' }}>
                Ordenado por:{' '}
                <Text style={{ fontWeight: '700' }}>
                  {columnas.find((c) => c.id === columnaOrdenada)?.label} (
                  {direccionOrden === 'asc' ? 'A-Z / 0-9' : 'Z-A / 9-0'})
                </Text>
              </Text>
              <Pressable
                onPress={() => {
                  setColumnaOrdenada(null);
                  setDireccionOrden(null);
                }}
                style={{ marginLeft: 4 }}
              >
                <Ionicons name="close-circle" size={14} color="#3B82F6" />
              </Pressable>
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: '#64748B' }}>
              💡 Haz clic en los títulos de las columnas para ordenar alfanuméricamente
            </Text>
          )}
        </View>

        {/* Acciones de Columnas */}
        {puedeMoverColumnas ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => setModalColumnasVisible(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 6,
                backgroundColor: pressed ? '#E2E8F0' : '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
              })}
            >
              <Ionicons name="options-outline" size={14} color="#0D2A48" />
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#0D2A48' }}>
                Reordenar Columnas
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Contenedor Scrollable Horizontal que usa el 100% de la pantalla */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={{ width: '100%' }}
        contentContainerStyle={{
          minWidth: '100%',
          flexGrow: 1,
          flexDirection: 'column',
        }}
      >
        <View style={{ width: '100%', minWidth: minTableWidth }}>
          {/* Cabecera de la tabla */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F8FAFC',
              borderBottomWidth: 1,
              borderBottomColor: '#CBD5E1',
              paddingVertical: 10,
              paddingHorizontal: 16,
              alignItems: 'center',
            }}
          >
            {columnas.map((col, index) => {
              const estaOrdenada = columnaOrdenada === col.id;
              const align = col.align || 'left';

              return (
                <View
                  key={col.id}
                  style={{
                    width: col.width as any,
                    minWidth: col.minWidth,
                    paddingRight: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent:
                      align === 'center'
                        ? 'center'
                        : align === 'right'
                        ? 'flex-end'
                        : 'space-between',
                  }}
                >
                  <Pressable
                    onPress={() => manejarClickCabecera(col)}
                    disabled={!puedeOrdenar || !col.sortable}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 1,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        fontWeight: estaOrdenada ? '800' : '700',
                        color: estaOrdenada ? '#0D2A48' : '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                      }}
                    >
                      {col.label}
                    </Text>

                    {col.sortable ? (
                      <View style={{ marginLeft: 2 }}>
                        {estaOrdenada ? (
                          <Ionicons
                            name={direccionOrden === 'asc' ? 'arrow-up' : 'arrow-down'}
                            size={13}
                            color="#0D2A48"
                          />
                        ) : (
                          <Ionicons name="swap-vertical" size={12} color="#94A3B8" />
                        )}
                      </View>
                    ) : null}
                  </Pressable>

                  {/* Flechitas sutiles para reordenar columna in situ */}
                  {puedeMoverColumnas ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginLeft: 4,
                        opacity: 0.7,
                      }}
                    >
                      {index > 0 ? (
                        <Pressable
                          onPress={() => moverColumnaIzquierda(index)}
                          hitSlop={4}
                          style={{ padding: 1 }}
                        >
                          <Ionicons name="chevron-back" size={11} color="#94A3B8" />
                        </Pressable>
                      ) : null}
                      {index < columnas.length - 1 ? (
                        <Pressable
                          onPress={() => moverColumnaDerecha(index)}
                          hitSlop={4}
                          style={{ padding: 1 }}
                        >
                          <Ionicons name="chevron-forward" size={11} color="#94A3B8" />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Filas de Datos */}
          {datosProcesados.length === 0 ? (
            <View style={{ paddingVertical: 45, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="file-tray-outline" size={32} color="#94A3B8" />
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 8 }}>
                {emptyMessage}
              </Text>
            </View>
          ) : (
            datosProcesados.map((item, filaIndex) => {
              const key = keyExtractor(item, filaIndex);
              const esPar = filaIndex % 2 === 0;

              return (
                <Pressable
                  key={key}
                  onPress={() => onRowPress?.(item)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9',
                    backgroundColor: pressed
                      ? 'rgba(214, 228, 244, 0.5)'
                      : esPar
                      ? '#FFFFFF'
                      : '#FAFCFF',
                  })}
                >
                  {columnas.map((col) => {
                    const align = col.align || 'left';
                    return (
                      <View
                        key={col.id}
                        style={{
                          width: col.width as any,
                          minWidth: col.minWidth,
                          paddingRight: 8,
                          justifyContent: 'center',
                          alignItems:
                            align === 'center'
                              ? 'center'
                              : align === 'right'
                              ? 'flex-end'
                              : 'flex-start',
                        }}
                      >
                        {col.render(item, filaIndex)}
                      </View>
                    );
                  })}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal para Reordenar Columnas */}
      <Modal
        visible={modalColumnasVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalColumnasVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 520,
              maxHeight: '80%',
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#CBD5E1',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 14,
            }}
          >
            {/* Header del Modal */}
            <View
              style={{
                backgroundColor: '#0D2A48',
                paddingHorizontal: 18,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="reorder-four" size={20} color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                  Organizar Columnas de la Tabla
                </Text>
              </View>
              <Pressable onPress={() => setModalColumnasVisible(false)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Contenido: Lista para mover arriba / abajo */}
            <View style={{ padding: 16, backgroundColor: '#F8FAFC' }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                Usa las flechas para reordenar la posición horizontal de las columnas:
              </Text>
            </View>

            <ScrollView style={{ paddingHorizontal: 16, paddingVertical: 8, maxHeight: 380 }}>
              {columnas.map((col, index) => {
                return (
                  <View
                    key={col.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: '#E2E8F0',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A', flex: 1 }}>
                        {col.label}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: '#64748B' }}>
                        {typeof col.width === 'string' ? col.width : `${col.width}px`}
                      </Text>
                    </View>

                    {/* Botones Mover */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Pressable
                        onPress={() => moverColumnaIzquierda(index)}
                        disabled={index === 0}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: index === 0 ? '#F1F5F9' : '#E2E8F0',
                          opacity: index === 0 ? 0.4 : 1,
                        }}
                      >
                        <Ionicons name="arrow-up" size={15} color="#0F172A" />
                      </Pressable>

                      <Pressable
                        onPress={() => moverColumnaDerecha(index)}
                        disabled={index === columnas.length - 1}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor:
                            index === columnas.length - 1 ? '#F1F5F9' : '#E2E8F0',
                          opacity: index === columnas.length - 1 ? 0.4 : 1,
                        }}
                      >
                        <Ionicons name="arrow-down" size={15} color="#0F172A" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Footer Modal */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 14,
                backgroundColor: '#F8FAFC',
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
              }}
            >
              <Pressable
                onPress={restablecerOrdenColumnas}
                style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#BE123C' }}>
                  Restablecer Orden Inicial
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setModalColumnasVisible(false)}
                style={{
                  backgroundColor: '#0D2A48',
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                  Guardar y Cerrar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
