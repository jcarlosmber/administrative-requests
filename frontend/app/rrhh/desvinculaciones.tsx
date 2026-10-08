import React from 'react';
import VinculacionesDesvinculacionesScreen from './vinculaciones-desvinculaciones';

/**
 * Pantalla de compatibilidad para la ruta anterior /rrhh/desvinculaciones
 * Renderiza el módulo integral situándose directamente en la pestaña de Desvinculaciones.
 */
export default function DesvinculacionesScreen() {
  return <VinculacionesDesvinculacionesScreen tabInicial="desvinculaciones" />;
}
