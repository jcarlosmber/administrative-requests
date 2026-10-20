import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ColumnConfig<T> {
  label: string;
  proportion: number; // Porcentaje proporcional base (ej. 15 para 15%)
  render: (item: T, idx: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
  sortKey?: string; // Clave para ordenar (ej. 'titular_nombre' o 'opec')
  sortValue?: (item: T) => any; // Función personalizada para extraer valor de ordenamiento
}

export interface PremiumTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  rowKey: (item: T) => string | number;
  pageSize?: number;
  variant?: 'white' | 'glass';
  maxHeight?: number | string;
  minTableWidth?: number;
  tituloTabla?: string;
}

type SortEntry = { keyIndex: number; direction: 'asc' | 'desc' };

export function PremiumTable<T>({
  data,
  columns,
  onRowClick,
  isLoading = false,
  emptyState,
  rowKey,
  pageSize,
  variant = 'white',
  maxHeight,
  minTableWidth = 900,
  tituloTabla,
}: PremiumTableProps<T>) {
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [sortStack, setSortStack] = useState<SortEntry[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(pageSize || 999999);
  const [columnOrder, setColumnOrder] = useState<number[]>(() => columns.map((_, i) => i));
  const [dragOverDisplayIdx, setDragOverDisplayIdx] = useState<number | null>(null);

  const containerRef = useRef<any>(null);
  const hasManuallyResized = useRef<boolean>(false);
  const resizingCol = useRef<number | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  const dragSourceDisplayIdx = useRef<number | null>(null);

  const columnLabels = useMemo(() => columns.map((c) => c.label).join(','), [columns]);

  // Sincronizar columnas cuando cambia la configuración de etiquetas
  useEffect(() => {
    setColumnOrder(columns.map((_, i) => i));
    setColumnWidths([]);
    setSortStack([]);
    hasManuallyResized.current = false;
  }, [columnLabels]);

  useEffect(() => {
    if (pageSize) {
      setVisibleCount(pageSize);
    }
  }, [data, pageSize]);

  // Cálculo proporcional de anchos
  const updateWidths = useCallback(() => {
    if (!hasManuallyResized.current && containerRef.current) {
      const containerWidth =
        containerRef.current.clientWidth ||
        containerRef.current.offsetWidth ||
        minTableWidth;
      const effectiveWidth = Math.max(containerWidth, minTableWidth);
      const totalProp = columns.reduce((acc, col) => acc + (col.proportion || 10), 0);

      const newWidths = columnOrder
        .map((origIdx) => columns[origIdx])
        .filter(Boolean)
        .map((col) => {
          const calcWidth = totalProp > 0 ? Math.floor(effectiveWidth * (col.proportion / totalProp)) : 100;
          return Math.max(col.minWidth || 70, calcWidth);
        });
      setColumnWidths(newWidths);
    }
  }, [columns, columnOrder, minTableWidth]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && containerRef.current) {
      const container = containerRef.current;
      updateWidths();

      if (window.ResizeObserver) {
        const observer = new window.ResizeObserver(() => {
          updateWidths();
        });
        observer.observe(container);
        return () => observer.disconnect();
      }
    } else {
      updateWidths();
    }
  }, [updateWidths]);

  // Manejo de redimensionamiento manual (Col Resize)
  const handleMouseDown = useCallback(
    (dispIdx: number, e: any) => {
      if (Platform.OS !== 'web') return;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();

      const containerWidth =
        containerRef.current?.clientWidth || containerRef.current?.offsetWidth || minTableWidth;
      const effectiveWidth = Math.max(containerWidth, minTableWidth);
      const totalProp = columns.reduce((acc, col) => acc + (col.proportion || 10), 0);

      let currentWidths = [...columnWidths];
      if (!hasManuallyResized.current || currentWidths.length !== columnOrder.length) {
        currentWidths = columnOrder.map((origIdx) => {
          const col = columns[origIdx];
          if (!col) return 80;
          return Math.max(col.minWidth || 70, Math.floor(effectiveWidth * ((col.proportion || 10) / totalProp)));
        });
        setColumnWidths(currentWidths);
      }

      hasManuallyResized.current = true;
      resizingCol.current = dispIdx;
      startX.current = e.pageX || e.clientX || 0;
      startWidth.current = currentWidths[dispIdx];

      const handleMouseMove = (moveEvent: any) => {
        const resizeIdx = resizingCol.current;
        if (resizeIdx !== null) {
          const clientX = moveEvent.pageX || moveEvent.clientX || 0;
          const delta = clientX - startX.current;

          setColumnWidths((prev) => {
            const current = prev.length > 0 ? prev : currentWidths;
            const next = [...current];
            const origIdx = columnOrder[resizeIdx];
            const col = columns[origIdx];
            const minW = col?.minWidth || 70;
            next[resizeIdx] = Math.max(minW, startWidth.current + delta);
            return next;
          });
        }
      };

      const handleMouseUp = () => {
        resizingCol.current = null;
        if (typeof document !== 'undefined') {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        }
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    },
    [columnWidths, columns, columnOrder, minTableWidth]
  );

  // Manejo de ordenamiento multi-columna (Sort Stack)
  const handleSort = (origIdx: number) => {
    const col = columns[origIdx];
    if (!col.sortKey && !col.sortValue) return;

    setSortStack((prev) => {
      const existingPos = prev.findIndex((e) => e.keyIndex === origIdx);
      if (existingPos === -1) {
        // Añadir a la pila como ordenamiento primario
        return [{ keyIndex: origIdx, direction: 'asc' }, ...prev];
      }
      if (prev[existingPos].direction === 'asc') {
        // Alternar a descendente
        return prev.map((e, i) => (i === existingPos ? { ...e, direction: 'desc' } : e));
      }
      // Si ya estaba en 'desc', quitar de la pila (desactivar orden en esa columna)
      return prev.filter((_, i) => i !== existingPos);
    });
  };

  // Reordenamiento por Drag & Drop
  const handleDrop = (dropDisplayIdx: number) => {
    const srcIdx = dragSourceDisplayIdx.current;
    if (srcIdx === null || srcIdx === dropDisplayIdx) {
      setDragOverDisplayIdx(null);
      return;
    }
    setColumnOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(dropDisplayIdx, 0, moved);
      return next;
    });
    setColumnWidths((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(dropDisplayIdx, 0, moved);
      return next;
    });
    dragSourceDisplayIdx.current = null;
    setDragOverDisplayIdx(null);
  };

  const getNestedValue = (obj: any, path: string) => {
    if (!obj || !path) return '';
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ''), obj);
  };

  // Datos ordenados aplicando el Sort Stack
  const sortedData = useMemo(() => {
    if (sortStack.length === 0) return data;

    const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

    return [...data].sort((a, b) => {
      for (const { keyIndex, direction } of sortStack) {
        const col = columns[keyIndex];
        if (!col) continue;

        const multiplier = direction === 'asc' ? 1 : -1;
        let valA = col.sortValue ? col.sortValue(a) : col.sortKey ? getNestedValue(a, col.sortKey) : '';
        let valB = col.sortValue ? col.sortValue(b) : col.sortKey ? getNestedValue(b, col.sortKey) : '';

        let cmp = 0;
        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[\$,\s]/g, ''));
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[\$,\s]/g, ''));

        if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
          cmp = (numA - numB) * multiplier;
        } else {
          if (valA === null || valA === undefined) valA = '';
          if (valB === null || valB === undefined) valB = '';
          cmp = collator.compare(String(valA).trim(), String(valB).trim()) * multiplier;
        }
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  }, [data, sortStack, columns]);

  // Anchos validados
  const widthsAreValid =
    columnWidths.length === columnOrder.length && columnWidths.length === columns.length;

  const getColWidth = (dispIdx: number, origIdx: number): DimensionValue => {
    if (widthsAreValid && columnWidths[dispIdx]) {
      return columnWidths[dispIdx];
    }
    const col = columns[origIdx];
    return col?.minWidth || 90;
  };

  const totalCalculatedWidth = useMemo(() => {
    if (widthsAreValid && columnWidths.length > 0) {
      return columnWidths.reduce((a, b) => a + b, 0);
    }
    return minTableWidth;
  }, [widthsAreValid, columnWidths, minTableWidth]);

  // Estado de carga con Skeleton nativo
  if (isLoading) {
    return (
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: 18,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ActivityIndicator size="small" color="#0284C7" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
            Cargando registros de la tabla...
          </Text>
        </View>
        {[1, 2, 3, 4, 5].map((key) => (
          <View
            key={key}
            style={{
              height: 48,
              backgroundColor: key % 2 === 0 ? '#F1F5F9' : '#F8FAFC',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              opacity: 0.8,
            }}
          />
        ))}
      </View>
    );
  }

  // Estado vacío
  if (data.length === 0 && emptyState) {
    return <View>{emptyState}</View>;
  }

  const isGlass = variant === 'glass';

  return (
    <View
      style={{
        backgroundColor: isGlass ? 'rgba(255, 255, 255, 0.85)' : '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        ...(maxHeight ? { maxHeight: maxHeight as any } : {}),
      }}
    >
      {tituloTabla && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            backgroundColor: isGlass ? 'transparent' : '#FFFFFF',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
            {tituloTabla}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>
            {sortedData.length} registros
          </Text>
        </View>
      )}

      {/* Contenedor con Scroll Horizontal y Vertical */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ minWidth: '100%' }}
      >
        <View
          ref={containerRef}
          style={{
            minWidth: totalCalculatedWidth,
            width: '100%',
          }}
        >
          {/* HEADER DE LA TABLA (STICKY & INTERACTIVO) */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#1E293B',
              borderBottomWidth: 1,
              borderBottomColor: '#334155',
            }}
          >
            {columnOrder.map((origIdx, dispIdx) => {
              const col = columns[origIdx];
              if (!col) return null;

              const canSort = !!col.sortKey || !!col.sortValue;
              const sortPriority = sortStack.findIndex((e) => e.keyIndex === origIdx);
              const sortEntry = sortPriority !== -1 ? sortStack[sortPriority] : null;
              const colWidth = getColWidth(dispIdx, origIdx);

              const isDragOver = dragOverDisplayIdx === dispIdx;

              const webProps: any =
                Platform.OS === 'web'
                  ? {
                      draggable: true,
                      onDragStart: () => {
                        dragSourceDisplayIdx.current = dispIdx;
                      },
                      onDragOver: (e: any) => {
                        if (e.preventDefault) e.preventDefault();
                        setDragOverDisplayIdx(dispIdx);
                      },
                      onDrop: () => handleDrop(dispIdx),
                      onDragEnd: () => {
                        dragSourceDisplayIdx.current = null;
                        setDragOverDisplayIdx(null);
                      },
                    }
                  : {};

              return (
                <View
                  key={`header-col-${origIdx}`}
                  {...webProps}
                  style={{
                    width: colWidth,
                    minWidth: col.minWidth || 70,
                    maxWidth: colWidth,
                    flexShrink: 0,
                    overflow: 'hidden',
                    position: 'relative',
                    borderRightWidth: dispIdx === columnOrder.length - 1 ? 0 : 1,
                    borderRightColor: '#334155',
                    backgroundColor: isDragOver ? '#334155' : undefined,
                    cursor: canSort ? 'pointer' : 'default',
                    userSelect: 'none',
                  } as any}
                >
                  <Pressable
                    onPress={() => handleSort(origIdx)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent:
                        col.align === 'center'
                          ? 'center'
                          : col.align === 'right'
                          ? 'flex-end'
                          : 'flex-start',
                      gap: 6,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 10.5,
                        fontWeight: '800',
                        color: sortEntry ? '#60A5FA' : '#94A3B8',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      {col.label}
                    </Text>

                    {/* Indicador de ordenamiento con número de prioridad */}
                    {canSort && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        {sortEntry ? (
                          <Ionicons
                            name={sortEntry.direction === 'asc' ? 'arrow-up' : 'arrow-down'}
                            size={12}
                            color="#38BDF8"
                          />
                        ) : (
                          <Ionicons name="swap-vertical-outline" size={12} color="#64748B" />
                        )}
                        {sortStack.length >= 2 && sortPriority !== -1 && (
                          <View
                            style={{
                              backgroundColor: '#0284C7',
                              borderRadius: 4,
                              paddingHorizontal: 3.5,
                              paddingVertical: 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 8.5,
                                fontWeight: '900',
                                color: '#FFFFFF',
                                lineHeight: 10,
                              }}
                            >
                              {sortPriority + 1}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>

                  {/* Manija de Redimensionamiento (Resize Handle) para Web */}
                  {dispIdx < columnOrder.length - 1 && Platform.OS === 'web' && (
                    <View
                      {...({
                        onMouseDown: (e: any) => handleMouseDown(dispIdx, e),
                        onClick: (e: any) => e.stopPropagation && e.stopPropagation(),
                      } as any)}
                      style={{
                        position: 'absolute',
                        right: -3,
                        top: 0,
                        bottom: 0,
                        width: 7,
                        cursor: 'col-resize',
                        zIndex: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      } as any}
                    >
                      <View style={{ width: 1.5, height: '60%', backgroundColor: '#475569' }} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* CUERPO DE LA TABLA (FILAS) */}
          <View style={{ backgroundColor: '#FFFFFF' }}>
            {sortedData.slice(0, visibleCount).map((item, rowIdx) => {
              const k = rowKey(item);
              const isEven = rowIdx % 2 === 0;

              return (
                <Pressable
                  key={`row-${k}`}
                  onPress={() => onRowClick?.(item)}
                  style={({ hovered }: any) => ({
                    flexDirection: 'row',
                    backgroundColor: hovered
                      ? '#EFF6FF'
                      : isEven
                      ? '#FFFFFF'
                      : '#F8FAFC',
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9',
                    minHeight: 46,
                    alignItems: 'center',
                    cursor: onRowClick ? 'pointer' : 'default',
                  } as any)}
                >
                  {columnOrder.map((origIdx, dispIdx) => {
                    const col = columns[origIdx];
                    if (!col) return null;
                    const colWidth = getColWidth(dispIdx, origIdx);

                    return (
                      <View
                        key={`cell-${k}-${origIdx}`}
                        style={{
                          width: colWidth,
                          minWidth: col.minWidth || 70,
                          maxWidth: colWidth,
                          flexShrink: 0,
                          overflow: 'hidden',
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRightWidth: dispIdx === columnOrder.length - 1 ? 0 : 1,
                          borderRightColor: '#F1F5F9',
                          justifyContent: 'center',
                          alignItems:
                            col.align === 'center'
                              ? 'center'
                              : col.align === 'right'
                              ? 'flex-end'
                              : 'flex-start',
                        }}
                      >
                        {col.render(item, rowIdx)}
                      </View>
                    );
                  })}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* CONTROLES DE PAGINACIÓN PROGRESIVA ("Ver más" / "Mostrar todos") */}
      {pageSize && sortedData.length > visibleCount && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: '#F8FAFC',
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
          }}
        >
          <Pressable
            onPress={() => setVisibleCount((prev) => prev + pageSize)}
            style={({ hovered }: any) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: hovered ? '#F1F5F9' : '#FFFFFF',
              borderWidth: 1,
              borderColor: '#CBD5E1',
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 8,
              cursor: 'pointer',
            } as any)}
          >
            <Ionicons name="chevron-down" size={14} color="#0284C7" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
              Ver más ({sortedData.length - visibleCount} restantes)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setVisibleCount(sortedData.length)}
            style={({ hovered }: any) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: hovered ? '#E2E8F0' : 'transparent',
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              cursor: 'pointer',
            } as any)}
          >
            <Ionicons name="expand-outline" size={14} color="#64748B" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
              Mostrar todos ({sortedData.length})
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default PremiumTable;
