import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlazaNomina, PersonaPerno } from '../../lib/nominaService';
import mockPlazasData from '../../lib/plantaMockData.json';
import mockPernoData from '../../lib/pernoMockData.json';
import BotonManualFunciones from '../BotonManualFunciones';
import { ModalPerfilCargo } from './ModalPerfilCargo';

const THEME = {
  marca900: '#0D2A48',
  marca800: '#123A63',
  marca700: '#174A7E',
  marca600: '#1F5A96',
  marca100: '#D6E4F4',
  marca50: '#EEF4FB',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  white: '#FFFFFF',
  emeraldBg: '#ECFDF5',
  emeraldText: '#047857',
  emeraldRing: 'rgba(5, 150, 105, 0.25)',
  roseBg: '#FFF1F2',
  roseText: '#BE123C',
  roseRing: 'rgba(225, 29, 72, 0.25)',
  amberBg: '#FFFBEB',
  amberText: '#B45309',
  amberRing: 'rgba(217, 119, 6, 0.25)',
};

export interface ModalFichaPlazaNominaProps {
  visible: boolean;
  onClose: () => void;
  plaza: PlazaNomina | null;
  todasLasPlazas?: PlazaNomina[];
  todoElPerno?: PersonaPerno[];
  onGuardadoPerfil?: (datos: any) => void;
}

export const ModalFichaPlazaNomina: React.FC<ModalFichaPlazaNominaProps> = ({
  visible,
  onClose,
  plaza,
  todasLasPlazas,
  todoElPerno,
  onGuardadoPerfil,
}) => {
  const [modalTab, setModalTab] = useState<'general' | 'funciones' | 'requisitos' | 'perno' | 'escalera'>('general');
  const [plazaActiva, setPlazaActiva] = useState<PlazaNomina | null>(plaza);
  const [modalEditarPerfilVisible, setModalEditarPerfilVisible] = useState(false);

  useEffect(() => {
    if (visible && plaza) {
      setPlazaActiva(plaza);
      setModalTab('general');
    }
  }, [visible, plaza]);

  const listadoPlazas = useMemo(() => {
    if (todasLasPlazas && todasLasPlazas.length > 0) return todasLasPlazas;
    return (mockPlazasData as unknown as PlazaNomina[]) || [];
  }, [todasLasPlazas]);

  const listadoPerno = useMemo(() => {
    if (todoElPerno && todoElPerno.length > 0) return todoElPerno;
    return (mockPernoData as unknown as PersonaPerno[]) || [];
  }, [todoElPerno]);

  const formatMoneda = (val?: number | string | null) => {
    if (val === null || val === undefined || val === '') return '$0';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[$,\s]/g, ''));
    if (isNaN(num)) return '$0';
    return '$' + Math.round(num).toLocaleString('es-CO');
  };

  const cleanLabel = (val?: string | null, fallback = '') => {
    if (!val || val === 'null' || val === 'undefined') return fallback;
    return val;
  };

  const calcEdad = (val?: string | null) => {
    if (!val) return null;
    const s = String(val).split('T')[0];
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const renderBadgeEstado = (estado?: string) => {
    const e = (estado || '').toUpperCase();
    if (e === 'OCUPADO' || e.includes('OCUPAD') || e.includes('PROPIEDAD')) {
      return (
        <View
          style={{
            backgroundColor: THEME.emeraldBg,
            borderColor: THEME.emeraldRing,
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 9999,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.emeraldText }} />
          <Text style={{ color: THEME.emeraldText, fontSize: 11, fontWeight: '600' }}>Ocupado</Text>
        </View>
      );
    }
    if (e.includes('DEFINITIVA') || e.includes('VACANTE')) {
      return (
        <View
          style={{
            backgroundColor: THEME.roseBg,
            borderColor: THEME.roseRing,
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 9999,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.roseText }} />
          <Text style={{ color: THEME.roseText, fontSize: 11, fontWeight: '600' }}>Vacante Definitiva</Text>
        </View>
      );
    }
    return (
      <View
        style={{
          backgroundColor: THEME.amberBg,
          borderColor: THEME.amberRing,
          borderWidth: 1,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 9999,
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.amberText }} />
        <Text style={{ color: THEME.amberText, fontSize: 11, fontWeight: '600' }}>{estado || 'En Proceso'}</Text>
      </View>
    );
  };

  const peldanosEscaleraModal = useMemo(() => {
    if (!plazaActiva?.id_escalera) return [];
    const idEsc = String(plazaActiva.id_escalera).trim().toUpperCase();
    return listadoPlazas
      .filter((p) => p.id_escalera && String(p.id_escalera).trim().toUpperCase() === idEsc)
      .sort((a, b) => Number(a.peldano_escalera || 0) - Number(b.peldano_escalera || 0));
  }, [plazaActiva, listadoPlazas]);

  const plazaEnriquecida = useMemo(() => {
    if (!plazaActiva) return null;
    const idPlazaNum = Number(plazaActiva.id_plaza);
    const mockMatch = (mockPlazasData as any[]).find(
      (m) => Number(m.id_plaza) === idPlazaNum
    );

    const esProvisional = Boolean(
      (plazaActiva.tipo_vinculacion || '').toUpperCase().includes('PROVISIONAL') ||
      (plazaActiva.tipo_vinculacion_cargo || '').toUpperCase().includes('PROVISIONAL') ||
      (plazaActiva.tipo_vinculacion_entidad || '').toUpperCase().includes('PROVISIONAL') ||
      (plazaActiva.situacion_administrativa || '').toUpperCase().includes('PROVISIONAL') ||
      Boolean(plazaActiva.pv)
    );

    // Detección estricta de vacante definitiva en la titularidad (Columna 13 o 15)
    const esTitularVacante = Boolean(
      !plazaActiva.titular_nombre ||
      String(plazaActiva.titular_nombre).trim().toUpperCase() === 'VACANTE DEFINITIVA' ||
      String(plazaActiva.titular_nombre).trim().toUpperCase().includes('VACANTE') ||
      String(plazaActiva.situacion_titular || '').trim().toUpperCase() === 'VACANTE DEFINITIVA' ||
      (String(plazaActiva.estado_cargo || '').trim().toUpperCase() === 'VACANTE DEFINITIVA' && !plazaActiva.titular_nombre)
    );

    const titularCedulaLimpia = (!esTitularVacante && plazaActiva.titular_cedula)
      ? String(plazaActiva.titular_cedula).replace(/\D/g, '')
      : (!esTitularVacante && mockMatch?.titular_cedula ? String(mockMatch.titular_cedula).replace(/\D/g, '') : '');

    const provisionalCedulaLimpia = esProvisional
      ? String(plazaActiva.servidor_activo_cedula || mockMatch?.servidor_activo_cedula || plazaActiva.encargo_cedula || mockMatch?.encargo_cedula || (esTitularVacante ? plazaActiva.titular_cedula : '') || '').replace(/\D/g, '')
      : '';

    // Encargo activo: SOLO si NO es provisional
    const tieneEncargoReal = !esProvisional && Boolean(
      plazaActiva.es_encargo ||
      (plazaActiva.encargo_nombre && plazaActiva.encargo_nombre.trim() !== '' && plazaActiva.encargo_nombre.trim() !== plazaActiva.titular_nombre) ||
      (plazaActiva.encargo_cedula && String(plazaActiva.encargo_cedula).trim() !== '' && String(plazaActiva.encargo_cedula).trim() !== String(plazaActiva.titular_cedula))
    );

    const encargoCedulaLimpia = tieneEncargoReal && plazaActiva.encargo_cedula
      ? String(plazaActiva.encargo_cedula).replace(/\D/g, '')
      : '';

    const pernoTitular = (!esTitularVacante && titularCedulaLimpia)
      ? listadoPerno.find((p) => String(p.cedula || '').replace(/\D/g, '') === titularCedulaLimpia)
      : null;

    const pernoEncargo = encargoCedulaLimpia
      ? listadoPerno.find((p) => String(p.cedula || '').replace(/\D/g, '') === encargoCedulaLimpia)
      : null;

    const pernoProvisional = provisionalCedulaLimpia
      ? listadoPerno.find((p) => String(p.cedula || '').replace(/\D/g, '') === provisionalCedulaLimpia)
      : null;

    // Solo buscar por posición si la plaza no tiene cédulas y no es vacante definitiva
    const pernoPorPosicion = (!esTitularVacante && !titularCedulaLimpia && !encargoCedulaLimpia && !provisionalCedulaLimpia && plazaActiva.id_perno)
      ? listadoPerno.find((p) => Number(p.posicion_planta) === Number(plazaActiva.id_perno))
      : null;

    const pernoActivo = tieneEncargoReal
      ? (pernoEncargo || pernoTitular)
      : (esProvisional
          ? (pernoProvisional || pernoPorPosicion)
          : (esTitularVacante ? null : (pernoTitular || pernoPorPosicion)));

    // Fechas de nacimiento reales (si el titular es vacante, NUNCA asignar fecha ni edad de titular)
    const fechaNacProvisional = esProvisional ? (pernoProvisional?.fecha_nacimiento || plazaActiva.fecha_nacimiento || null) : null;
    const fechaNacTitular = esTitularVacante
      ? null
      : (pernoTitular?.fecha_nacimiento || (!tieneEncargoReal ? (plazaActiva.fecha_nacimiento || mockMatch?.fecha_nacimiento) : null));
    const fechaNacEncargo = tieneEncargoReal ? (pernoEncargo?.fecha_nacimiento || null) : null;
    const fechaNacActiva = tieneEncargoReal
      ? (fechaNacEncargo || null)
      : (esProvisional
          ? (fechaNacProvisional || null)
          : (esTitularVacante ? null : (fechaNacTitular || null)));

    const edadProvisional = esProvisional
      ? (fechaNacProvisional ? calcEdad(fechaNacProvisional) : (plazaActiva?.edad ? Number(plazaActiva.edad) : null))
      : null;

    const edadTitular = esTitularVacante
      ? null
      : (fechaNacTitular
          ? calcEdad(fechaNacTitular)
          : (!tieneEncargoReal && (plazaActiva.edad || mockMatch?.edad) ? Number(plazaActiva.edad || mockMatch?.edad) : null));

    const edadEncargo = tieneEncargoReal
      ? (fechaNacEncargo ? calcEdad(fechaNacEncargo) : null)
      : null;

    const edadActiva = tieneEncargoReal ? edadEncargo : (esProvisional ? edadProvisional : (esTitularVacante ? null : edadTitular));

    const manualOficial =
      plazaActiva.manual_funciones ||
      mockMatch?.manual_funciones ||
      plazaActiva.resolucion_manual ||
      mockMatch?.resolucion_manual ||
      'Resolución 104 de 2024 / Planta Oficial';

    const resolucionOficial =
      plazaActiva.resolucion_manual ||
      mockMatch?.resolucion_manual ||
      manualOficial;

    const normalizarFuncionesRobustas = (input: any): string[] => {
      if (!input) return [];
      let lista: string[] = [];
      if (Array.isArray(input)) {
        lista = input.map((s) => String(s || '').trim()).filter(Boolean);
      } else if (typeof input === 'string') {
        lista = input.split('\n').map((s) => s.trim()).filter(Boolean);
      }

      const resultado: string[] = [];
      for (const item of lista) {
        const partes = item
          .split(/(?=(?:^|\n|[\.\s])\d+[\.\)]\s*[A-ZÁÉÍÓÚÑ])/g)
          .map((p) => p.replace(/^[\s\.\,\;\-]+/, '').trim())
          .filter((p) => p.length > 5);
        if (partes.length > 1) {
          resultado.push(...partes);
        } else {
          resultado.push(item);
        }
      }

      return resultado.map((f, i) => {
        const clean = f.replace(/^\d+[\.\)]\s*/, '').trim();
        return `${i + 1}. ${clean}`;
      });
    };

    const funcionesArray: string[] = (() => {
      const candidata =
        (Array.isArray(plazaActiva.funciones) && plazaActiva.funciones.length > 0)
          ? plazaActiva.funciones
          : (typeof plazaActiva.funciones === 'string' && plazaActiva.funciones.trim())
          ? plazaActiva.funciones
          : (mockMatch && Array.isArray(mockMatch.funciones) && mockMatch.funciones.length > 0)
          ? mockMatch.funciones
          : (mockMatch && typeof mockMatch.funciones === 'string' && mockMatch.funciones.trim())
          ? mockMatch.funciones
          : null;

      if (candidata) {
        const parseadas = normalizarFuncionesRobustas(candidata);
        if (parseadas.length > 0) return parseadas;
      }

      return [
        '1. Asesorar y ejecutar las actividades técnicas, jurídicas y operativas del empleo conforme al Plan Estratégico Institucional.',
        '2. Desarrollar y verificar actos administrativos, conceptos técnicos y documentos de gestión asignados por la dirección.',
        '3. Participar en la implementación del Sistema Integrado de Gestión y en el cumplimiento de los estándares de calidad distrital.',
        '4. Atender y dar trámite oportuno a las solicitudes, expedientes y peticiones ciudadanas o requerimientos de entes de control.',
        '5. Desempeñar las demás funciones asignadas por el superior inmediato conforme a la naturaleza y nivel del empleo.',
      ];
    })();

    const propositoTexto: string =
      plazaActiva.proposito ||
      mockMatch?.proposito ||
      `Ejecutar y coordinar las actividades técnicas, operativas y administrativas asignadas a la ${
        plazaActiva.dependencia_cargo || (plazaActiva as any).dependencia_empleo || 'dependencia'
      }, asegurando la eficiencia, eficacia y cumplimiento normativo institucional de la Secretaría Jurídica Distrital.`;

    const requisitosTexto: string =
      plazaActiva.requisitos ||
      mockMatch?.requisitos ||
      'Título y formación según el nivel jerárquico (NBC afín a la entidad) y experiencia laboral acorde al Manual Específico de Funciones y Competencias Laborales.';

    const requisitosFormacionTexto: string =
      plazaActiva.requisitos_formacion ||
      (mockMatch as any)?.requisitos_formacion ||
      plazaActiva.requisitos ||
      mockMatch?.requisitos ||
      'Título o formación reglamentaria según el nivel jerárquico y núcleo básico del conocimiento afín.';

    const requisitosExperienciaTexto: string =
      plazaActiva.requisitos_experiencia ||
      (mockMatch as any)?.requisitos_experiencia ||
      'No requiere experiencia previa o según lo reglamentado en el manual de funciones.';

    const mesesExpValor: number | null =
      plazaActiva.meses_experiencia !== undefined && plazaActiva.meses_experiencia !== null
        ? Number(plazaActiva.meses_experiencia)
        : ((mockMatch as any)?.meses_experiencia !== undefined && (mockMatch as any)?.meses_experiencia !== null)
        ? Number((mockMatch as any).meses_experiencia)
        : null;

    return {
      ...plazaActiva,
      tipo_vinculacion_entidad: esTitularVacante
        ? 'No aplica (Vacante Definitiva)'
        : (plazaActiva.tipo_vinculacion_entidad || (mockMatch as any)?.tipo_vinculacion_entidad || null),
      tipo_vinculacion_cargo: esTitularVacante
        ? 'No aplica (Vacante)'
        : (plazaActiva.tipo_vinculacion_cargo || (mockMatch as any)?.tipo_vinculacion_cargo || plazaActiva.tipo_vinculacion || (mockMatch as any)?.tipo_vinculacion || null),
      proposito: propositoTexto,
      funciones: funcionesArray,
      requisitos: requisitosTexto,
      requisitos_formacion: requisitosFormacionTexto,
      requisitos_experiencia: requisitosExperienciaTexto,
      meses_experiencia: mesesExpValor,
      manual_funciones: manualOficial,
      resolucion_manual: resolucionOficial,
      perno_activo: pernoActivo,
      perno_titular: pernoTitular,
      perno_encargo: pernoEncargo,
      edad_activa: edadActiva,
      edad_titular: edadTitular,
      edad_encargo: edadEncargo,
      fecha_nacimiento_activa: fechaNacActiva,
      fecha_nacimiento_titular: fechaNacTitular,
      fecha_nacimiento_encargo: fechaNacEncargo,
      tipo_sangre_activa: pernoActivo?.tipo_sangre ? `${pernoActivo.tipo_sangre} ${pernoActivo.rh || ''}`.trim() : null,
      fondo_salud: pernoActivo?.fondo_salud || plazaActiva.fondo_salud || mockMatch?.fondo_salud || 'No reportada',
      fondo_pension: pernoActivo?.fondo_pension || plazaActiva.fondo_pension || mockMatch?.fondo_pension || 'No reportado',
      fondo_cesantias: pernoActivo?.fondo_cesantias || plazaActiva.fondo_cesantias || mockMatch?.fondo_cesantias || 'No reportado',
      telefono: pernoActivo?.telefono || plazaActiva.telefono || mockMatch?.telefono || 'No registrado',
      direccion: pernoActivo?.direccion || plazaActiva.direccion || mockMatch?.direccion || 'No registrada',
      sexo: pernoActivo?.sexo || plazaActiva.sexo || mockMatch?.sexo || '---',
      tipo_funcionario: pernoActivo?.tipo_funcionario || plazaActiva.tipo_funcionario || mockMatch?.tipo_funcionario || 'EMPLEADO DE PLANTA',
      es_titular_vacante: esTitularVacante,
      es_provisional: esProvisional,
      acto_nombramiento: esTitularVacante
        ? 'No aplica (Vacante)'
        : (pernoTitular?.acto_nombramiento || plazaActiva.acto_nombramiento || mockMatch?.acto_nombramiento || plazaActiva.numero_acto_nombramiento || 'Resolución institucional'),
      numero_acto_nombramiento: esTitularVacante
        ? '---'
        : (pernoTitular?.numero_acto_nombramiento || plazaActiva.numero_acto_nombramiento || mockMatch?.numero_acto_nombramiento || '---'),
      fecha_acto_nombramiento: esTitularVacante
        ? null
        : (pernoTitular?.fecha_acto_nombramiento || plazaActiva.fecha_acto_nombramiento || mockMatch?.fecha_acto_nombramiento || null),
      fecha_ingreso_entidad: (esTitularVacante && !tieneEncargoReal)
        ? null
        : (pernoActivo?.fecha_ingreso_entidad ||
           (plazaActiva as any).fecha_ingreso_entidad ||
           mockMatch?.fecha_ingreso_entidad ||
           null),
      fecha_ingreso_distrito: (esTitularVacante && !tieneEncargoReal)
        ? null
        : (pernoActivo?.fecha_ingreso_distrito ||
           (plazaActiva as any).fecha_ingreso_distrito ||
           mockMatch?.fecha_ingreso_distrito ||
           null),
      total_devengado:
        pernoActivo?.total_devengado ||
        plazaActiva.total_devengado ||
        (mockMatch?.total_devengado ? Number(mockMatch.total_devengado) : undefined) ||
        (plazaActiva.asignacion_basica ? Number(plazaActiva.asignacion_basica) : undefined),
    };
  }, [plazaActiva, listadoPerno]);

  if (!visible || !plazaActiva) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 1040,
              maxHeight: '92%',
              backgroundColor: THEME.white,
              borderRadius: 14,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
            }}
          >
            {/* Cabecera del Modal */}
            <View
              style={{
                backgroundColor: THEME.marca900,
                paddingHorizontal: 20,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text
                    style={{
                      color: 'rgba(214, 228, 244, 0.75)',
                      fontSize: 11,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Ficha Técnica Plaza #{plazaActiva?.id_plaza}
                  </Text>
                  {plazaActiva?.id_sideap ? (
                    <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '700' }}>
                        SIDEAP: #{plazaActiva.id_sideap}
                      </Text>
                    </View>
                  ) : null}
                  {(plazaEnriquecida?.manual_funciones || plazaEnriquecida?.resolucion_manual) ? (
                    <View style={{ backgroundColor: 'rgba(254, 243, 199, 0.25)', borderColor: 'rgba(253, 230, 138, 0.4)', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ color: '#FEF3C7', fontSize: 10, fontWeight: '700' }}>
                        Manual: {plazaEnriquecida.manual_funciones || plazaEnriquecida.resolucion_manual}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: THEME.white, fontSize: 17, fontWeight: '600', marginTop: 3 }}>
                  {plazaActiva?.cargo}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BotonManualFunciones
                  id_sideap={plazaActiva?.id_sideap}
                  cargo={plazaActiva?.cargo}
                  codigo={plazaActiva?.codigo}
                  grado={plazaActiva?.grado}
                  variante="header"
                  etiqueta="Manual Funciones (PDF)"
                />

                <Pressable
                  onPress={() => setModalEditarPerfilVisible(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                  })}
                >
                  <Ionicons name="create-outline" size={15} color={THEME.white} />
                  <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '700' }}>
                    Editar Perfil / Manual
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    padding: 6,
                    borderRadius: 6,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  })}
                >
                  <Ionicons name="close" size={20} color={THEME.white} />
                </Pressable>
              </View>
            </View>

            {/* Barra de Tabs del Modal con Scroll Horizontal */}
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: THEME.slate200,
                backgroundColor: THEME.slate50,
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  gap: 6,
                }}
              >
                {/* Tab 1: General & Planta */}
                <Pressable
                  onPress={() => setModalTab('general')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderBottomWidth: 2,
                    borderBottomColor: modalTab === 'general' ? THEME.marca600 : 'transparent',
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={modalTab === 'general' ? THEME.marca700 : THEME.slate500}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: modalTab === 'general' ? '700' : '500',
                      color: modalTab === 'general' ? THEME.marca700 : THEME.slate600,
                    }}
                  >
                    General & Planta
                  </Text>
                </Pressable>

                {/* Tab 2: Manual de Funciones */}
                <Pressable
                  onPress={() => setModalTab('funciones')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderBottomWidth: 2,
                    borderBottomColor: modalTab === 'funciones' ? THEME.marca600 : 'transparent',
                  }}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={modalTab === 'funciones' ? THEME.marca700 : THEME.slate500}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: modalTab === 'funciones' ? '700' : '500',
                      color: modalTab === 'funciones' ? THEME.marca700 : THEME.slate600,
                    }}
                  >
                    Manual de Funciones
                  </Text>
                  {plazaEnriquecida?.funciones?.length ? (
                    <View
                      style={{
                        backgroundColor: modalTab === 'funciones' ? THEME.marca100 : THEME.slate200,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: modalTab === 'funciones' ? THEME.marca700 : THEME.slate600,
                        }}
                      >
                        {plazaEnriquecida.funciones.length}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>

                {/* Tab 3: Requisitos & Perfil */}
                <Pressable
                  onPress={() => setModalTab('requisitos')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderBottomWidth: 2,
                    borderBottomColor: modalTab === 'requisitos' ? THEME.marca600 : 'transparent',
                  }}
                >
                  <Ionicons
                    name="school-outline"
                    size={16}
                    color={modalTab === 'requisitos' ? THEME.marca700 : THEME.slate500}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: modalTab === 'requisitos' ? '700' : '500',
                      color: modalTab === 'requisitos' ? THEME.marca700 : THEME.slate600,
                    }}
                  >
                    Requisitos & Perfil
                  </Text>
                </Pressable>

                {/* Tab 4: Seguridad Social & PERNO */}
                <Pressable
                  onPress={() => setModalTab('perno')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderBottomWidth: 2,
                    borderBottomColor: modalTab === 'perno' ? THEME.marca600 : 'transparent',
                  }}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color={modalTab === 'perno' ? THEME.marca700 : THEME.slate500}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: modalTab === 'perno' ? '700' : '500',
                      color: modalTab === 'perno' ? THEME.marca700 : THEME.slate600,
                    }}
                  >
                    Seg. Social & PERNO
                  </Text>
                </Pressable>

                {/* Tab 5: Escalera de Encargos */}
                <Pressable
                  onPress={() => setModalTab('escalera')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderBottomWidth: 2,
                    borderBottomColor: modalTab === 'escalera' ? THEME.marca600 : 'transparent',
                  }}
                >
                  <Ionicons
                    name="git-network-outline"
                    size={16}
                    color={modalTab === 'escalera' ? THEME.marca700 : THEME.slate500}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: modalTab === 'escalera' ? '700' : '500',
                      color: modalTab === 'escalera' ? THEME.marca700 : THEME.slate600,
                    }}
                  >
                    Escalera
                  </Text>
                  {plazaActiva?.id_escalera ? (
                    <View
                      style={{
                        backgroundColor: modalTab === 'escalera' ? '#EEF2FF' : THEME.slate200,
                        borderColor: modalTab === 'escalera' ? '#C7D2FE' : 'transparent',
                        borderWidth: 1,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: modalTab === 'escalera' ? '#4338CA' : THEME.slate700,
                        }}
                      >
                        {plazaActiva.id_escalera} · #{plazaActiva.peldano_escalera || 1}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </ScrollView>
            </View>

            {/* ========================================================= */}
            {/* TAB 1: INFORMACIÓN GENERAL Y PLANTA DE PERSONAL           */}
            {/* ========================================================= */}
            {modalTab === 'general' && (
              <ScrollView style={{ padding: 20 }}>
                {plazaActiva?.id_escalera ? (
                  <Pressable
                    onPress={() => setModalTab('escalera')}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#EEF2FF' : '#F5F3FF',
                      borderColor: '#C7D2FE',
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#4338CA',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="git-network-outline" size={18} color={THEME.white} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#312E81' }}>
                            Escalera de Encargos: {plazaActiva.id_escalera}
                          </Text>
                          <View
                            style={{
                              backgroundColor: '#E0E7FF',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#4338CA' }}>
                              Peldaño #{plazaActiva.peldano_escalera || 1}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11.5, color: THEME.slate600, marginTop: 2 }}>
                          Cadena de sucesión de {peldanosEscaleraModal.length} peldaño(s) · Toca para ver la escalera completa
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#4338CA" />
                  </Pressable>
                ) : null}

                {/* SECCIÓN 1: ESPECIFICACIONES DE PLANTA */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    1. Especificaciones de Planta
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ backgroundColor: THEME.slate100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.slate600 }}>
                        PLAZA #{plazaActiva?.id_plaza}
                      </Text>
                    </View>
                    {plazaActiva?.id_sideap ? (
                      <View style={{ backgroundColor: THEME.marca50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.marca700 }}>
                          SIDEAP #{plazaActiva.id_sideap}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: THEME.slate50,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 14,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Nivel Jerárquico</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate900, marginTop: 2 }}>
                      {plazaActiva?.nivel || '---'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Código y Grado</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate900, marginTop: 2 }}>
                      Cód. {plazaActiva?.codigo || '---'} - Gr. {plazaActiva?.grado || '---'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Estado de la Plaza</Text>
                    <View style={{ marginTop: 4 }}>{renderBadgeEstado(plazaActiva?.estado_cargo)}</View>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Asignación Básica Mensual</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.emeraldText, marginTop: 2 }}>
                      {formatMoneda(plazaActiva?.asignacion_basica)}
                    </Text>
                  </View>

                  <View style={{ width: '100%' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca700 }}>Dependencia del Cargo (Planta)</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate900, marginTop: 2 }}>
                      {plazaActiva?.dependencia_cargo || 'Secretaría Jurídica Distrital'}
                    </Text>
                  </View>

                  {plazaActiva?.dependencia_funcional && plazaActiva.dependencia_funcional !== plazaActiva.dependencia_cargo ? (
                    <View style={{ width: '100%' }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Dependencia Funcional Asignada</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '500', color: THEME.slate700, marginTop: 2 }}>
                        {plazaActiva.dependencia_funcional}
                      </Text>
                    </View>
                  ) : null}

                  {/* Manual de Funciones Oficial */}
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: '#EFF6FF',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      marginTop: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="bookmark-outline" size={15} color={THEME.marca700} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca800, textTransform: 'uppercase' }}>
                          Manual Específico de Funciones y Competencias
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E40AF' }}>PERFIL OFICIAL</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate900, marginTop: 4 }}>
                      {plazaEnriquecida?.manual_funciones || plazaEnriquecida?.resolucion_manual || 'No especificado en el perfil'}
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.slate600, marginTop: 2 }}>
                      Páginas y especificación oficial del Manual Específico de Funciones y de Competencias Laborales de la Secretaría Jurídica Distrital.
                    </Text>
                  </View>
                </View>

                {/* SECCIÓN 2: SERVIDORES PÚBLICOS ASIGNADOS */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  2. Servidores Públicos Asignados (Encargo y Titularidad)
                </Text>

                {plazaActiva?.es_encargo || (plazaActiva?.encargo_nombre && plazaActiva.encargo_nombre.trim() !== '') ? (
                  <View style={{ gap: 12, marginBottom: 20 }}>
                    {/* BLOQUE 1: SERVIDOR EN ENCARGO */}
                    <View
                      style={{
                        backgroundColor: '#FFFBEB',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                        padding: 14,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={{
                              backgroundColor: '#F59E0B',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '700' }}>
                              PRIMERO: ENCARGADO(A)
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>
                            Servidor desempeñando actualmente la plaza
                          </Text>
                        </View>
                        <Ionicons name="swap-horizontal" size={16} color="#B45309" />
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900, marginBottom: 4 }}>
                        {plazaActiva.encargo_nombre}
                      </Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Número de Cédula</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            {plazaActiva.encargo_cedula ? `C.C. ${plazaActiva.encargo_cedula}` : 'No registrada'}
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Edad de la Persona</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#B45309' }}>
                              {plazaEnriquecida?.edad_encargo ? `${plazaEnriquecida.edad_encargo} años` : (plazaEnriquecida?.edad_activa ? `${plazaEnriquecida.edad_activa} años` : 'No registrada')}
                            </Text>
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#92400E' }}>PERNO</Text>
                            </View>
                          </View>
                          {plazaEnriquecida?.fecha_nacimiento_encargo ? (
                            <Text style={{ fontSize: 10, color: THEME.slate500, marginTop: 1 }}>
                              F. Nac: {plazaEnriquecida.fecha_nacimiento_encargo}
                            </Text>
                          ) : null}
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación Administrativa</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#B45309', marginTop: 1 }}>
                            {cleanLabel(plazaActiva.situacion_administrativa, 'ENCARGO')}
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Vinculación</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            {plazaActiva.tipo_vinculacion || 'Planta'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* BLOQUE 2: SERVIDOR TITULAR DEL CARGO */}
                    <View
                      style={{
                        backgroundColor: THEME.slate50,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        padding: 14,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={{
                              backgroundColor: THEME.slate600,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '700' }}>
                              LUEGO: TITULAR DEL CARGO
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate600 }}>
                            Servidor titular en propiedad de la plaza
                          </Text>
                        </View>
                        <Ionicons name="ribbon-outline" size={16} color={THEME.slate500} />
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900, marginBottom: 4 }}>
                        {plazaEnriquecida?.es_titular_vacante ? 'VACANTE DEFINITIVA' : (plazaActiva.titular_nombre || 'Plaza Vacante Definitiva')}
                      </Text>

                      {plazaEnriquecida?.es_titular_vacante ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Cédula Titular</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate600, marginTop: 1 }}>
                              No aplica (Plaza Vacante)
                            </Text>
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación de la Plaza</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.marca700, marginTop: 1 }}>
                              VACANTE DEFINITIVA
                            </Text>
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tipo de Provisión</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                              Provista transitoriamente por encargo
                            </Text>
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Condición</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                              Empleo en vacancia definitiva provisto por servidor encargado
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Cédula Titular</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                              {plazaActiva.titular_cedula ? `C.C. ${plazaActiva.titular_cedula}` : 'No registrada'}
                            </Text>
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Edad de la Persona</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.slate800 }}>
                                {plazaEnriquecida?.edad_titular ? `${plazaEnriquecida.edad_titular} años` : 'No registrada'}
                              </Text>
                              {plazaEnriquecida?.edad_titular ? (
                                <View style={{ backgroundColor: THEME.slate200, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.slate700 }}>PERNO</Text>
                                </View>
                              ) : null}
                            </View>
                            {plazaEnriquecida?.fecha_nacimiento_titular ? (
                              <Text style={{ fontSize: 10, color: THEME.slate500, marginTop: 1 }}>
                                F. Nac: {plazaEnriquecida.fecha_nacimiento_titular}
                              </Text>
                            ) : null}
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación Titular</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                              {cleanLabel(plazaActiva.situacion_titular, 'En comisión o encargo en otro empleo')}
                            </Text>
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tipo de Vinculación a la Entidad</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                              {plazaEnriquecida?.tipo_vinculacion_entidad || plazaActiva.tipo_vinculacion_entidad || '---'}
                            </Text>
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tipo de Vinculación al Cargo/ SIDEAP</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                              {plazaEnriquecida?.tipo_vinculacion_cargo || plazaActiva.tipo_vinculacion_cargo || plazaActiva.tipo_vinculacion || '---'}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: THEME.slate50,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      padding: 14,
                      marginBottom: 20,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={{
                            backgroundColor: plazaEnriquecida?.es_provisional ? '#D97706' : (plazaEnriquecida?.es_titular_vacante ? THEME.slate600 : THEME.marca700),
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: THEME.white, fontSize: 10, fontWeight: '700' }}>
                            {plazaEnriquecida?.es_provisional ? 'SERVIDOR PROVISIONAL' : (plazaEnriquecida?.es_titular_vacante ? 'ESTADO DE LA PLAZA' : 'TITULAR DIRECTO')}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.slate600 }}>
                          {plazaEnriquecida?.es_provisional ? 'Servidor desempeñando el empleo en provisionalidad' : (plazaEnriquecida?.es_titular_vacante ? 'Plaza en vacancia definitiva' : 'Servidor en ejercicio del cargo')}
                        </Text>
                      </View>
                      <Ionicons
                        name={plazaEnriquecida?.es_provisional ? 'person-outline' : (plazaEnriquecida?.es_titular_vacante ? 'alert-circle-outline' : 'person-outline')}
                        size={16}
                        color={plazaEnriquecida?.es_provisional ? '#D97706' : (plazaEnriquecida?.es_titular_vacante ? THEME.slate600 : THEME.marca700)}
                      />
                    </View>

                    <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900, marginBottom: 4 }}>
                      {plazaEnriquecida?.es_provisional
                        ? (plazaActiva.titular_nombre || 'Servidor Provisional')
                        : (plazaEnriquecida?.es_titular_vacante ? 'VACANTE DEFINITIVA' : (plazaActiva.titular_nombre || 'Sin Titular Asignado'))}
                    </Text>

                    {plazaEnriquecida?.es_provisional ? (
                      <View style={{ gap: 10, width: '100%', marginTop: 4 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Número de Cédula</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                              {plazaActiva.titular_cedula ? `C.C. ${plazaActiva.titular_cedula}` : 'No registrada'}
                            </Text>
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Edad</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#B45309' }}>
                                {plazaEnriquecida?.edad_activa ? `${plazaEnriquecida.edad_activa} años` : 'No registrada'}
                              </Text>
                              {plazaEnriquecida?.edad_activa ? (
                                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#92400E' }}>PERNO</Text>
                                </View>
                              ) : null}
                            </View>
                            {plazaEnriquecida?.fecha_nacimiento_activa ? (
                              <Text style={{ fontSize: 10, color: THEME.slate500, marginTop: 1 }}>
                                F. Nac: {plazaEnriquecida.fecha_nacimiento_activa}
                              </Text>
                            ) : null}
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tipo de Vinculación al Cargo/ SIDEAP</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#B45309', marginTop: 1 }}>
                              {plazaEnriquecida?.tipo_vinculacion_cargo || plazaActiva.tipo_vinculacion_cargo || 'EN PROVISIONALIDAD'}
                            </Text>
                          </View>

                          <View>
                            <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación Administrativa</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                              {cleanLabel(plazaActiva?.situacion_administrativa, 'PROVISIONALIDAD')}
                            </Text>
                          </View>
                        </View>

                        <View style={{ backgroundColor: '#EFF6FF', borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE', padding: 10, marginTop: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Ionicons name="information-circle" size={14} color="#1E40AF" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF', textTransform: 'uppercase' }}>
                              Titularidad del Empleo (Columna O)
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.roseText }}>
                            VACANTE DEFINITIVA
                          </Text>
                          <Text style={{ fontSize: 11, color: THEME.slate600, marginTop: 1 }}>
                            Empleo de carrera en vacancia definitiva provisto transitoriamente mediante nombramiento en provisionalidad.
                          </Text>
                        </View>
                      </View>
                    ) : plazaEnriquecida?.es_titular_vacante ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Número de Cédula</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate600, marginTop: 1 }}>
                            No aplica (Plaza Vacante)
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación de la Plaza</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.marca700, marginTop: 1 }}>
                            VACANTE DEFINITIVA
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Disponibilidad</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            Disponible para provisión definitiva o encargo
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Nombramiento</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate600, marginTop: 1 }}>
                            Sin titular nombrado
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Número de Cédula</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            {plazaActiva.titular_cedula ? `C.C. ${plazaActiva.titular_cedula}` : 'No registrada'}
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Edad</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.slate800 }}>
                              {plazaEnriquecida?.edad_titular ? `${plazaEnriquecida.edad_titular} años` : (plazaEnriquecida?.edad_activa ? `${plazaEnriquecida.edad_activa} años` : 'No registrada')}
                            </Text>
                            {(plazaEnriquecida?.edad_titular || plazaEnriquecida?.edad_activa) ? (
                              <View style={{ backgroundColor: THEME.slate200, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ fontSize: 9.5, fontWeight: '700', color: THEME.slate700 }}>PERNO</Text>
                              </View>
                            ) : null}
                          </View>
                          {(plazaEnriquecida?.fecha_nacimiento_titular || plazaEnriquecida?.fecha_nacimiento_activa) ? (
                            <Text style={{ fontSize: 10, color: THEME.slate500, marginTop: 1 }}>
                              F. Nac: {plazaEnriquecida.fecha_nacimiento_titular || plazaEnriquecida.fecha_nacimiento_activa}
                            </Text>
                          ) : null}
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tipo de Vinculación a la Entidad</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            {plazaEnriquecida?.tipo_vinculacion_entidad || plazaActiva.tipo_vinculacion_entidad || '---'}
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Tipo de Vinculación al Cargo/ SIDEAP</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            {plazaEnriquecida?.tipo_vinculacion_cargo || plazaActiva.tipo_vinculacion_cargo || plazaActiva.tipo_vinculacion || '---'}
                          </Text>
                        </View>

                        <View>
                          <Text style={{ fontSize: 11, color: THEME.slate500 }}>Situación Administrativa</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 1 }}>
                            {cleanLabel(plazaActiva?.situacion_administrativa, 'Servicio Activo en Propiedad')}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* SECCIÓN 3: VINCULACIÓN DISTRITAL Y PERNO */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  3. Vinculación Distrital y Actos Administrativos
                </Text>

                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 14,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 14,
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Acto de Nombramiento</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate900, marginTop: 2 }}>
                      {plazaEnriquecida?.acto_nombramiento || plazaEnriquecida?.numero_acto_nombramiento || 'Resolución interna'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Fecha Acto</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate900, marginTop: 2 }}>
                      {plazaEnriquecida?.fecha_acto_nombramiento || 'No reportada'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Fecha Ingreso Entidad</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate900, marginTop: 2 }}>
                      {plazaEnriquecida?.fecha_ingreso_entidad || 'No reportada'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>Fecha Ingreso Distrito</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate900, marginTop: 2 }}>
                      {plazaEnriquecida?.fecha_ingreso_distrito || 'No reportada'}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* ========================================================= */}
            {/* TAB 2: MANUAL DE FUNCIONES OFICIAL                        */}
            {/* ========================================================= */}
            {modalTab === 'funciones' && (
              <ScrollView style={{ padding: 20 }}>
                {/* Banner de identificación del cargo y manual de planta oficial */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase' }}>
                        Manual de Funciones · Archivo de Planta Oficial SJD
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.slate900, marginTop: 2 }}>
                        {plazaActiva?.cargo} · Cód. {plazaActiva?.codigo} Gr. {plazaActiva?.grado}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {plazaEnriquecida?.resolucion_manual ? (
                        <View
                          style={{
                            backgroundColor: '#FEF3C7',
                            borderColor: '#FDE68A',
                            borderWidth: 1,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Ionicons name="document-text" size={13} color="#92400E" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>
                            {plazaEnriquecida.resolucion_manual}
                          </Text>
                        </View>
                      ) : null}
                      <View style={{ backgroundColor: THEME.marca50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca700 }}>
                          {plazaEnriquecida?.funciones?.length || 0} Funciones Oficiales del Cargo
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Tarjeta Destacada: Propósito Principal del Empleo */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Ionicons name="flag-outline" size={17} color={THEME.marca700} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900, textTransform: 'uppercase' }}>
                      Propósito Principal del Empleo
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: THEME.slate800, lineHeight: 20 }}>
                    {plazaEnriquecida?.proposito}
                  </Text>
                </View>

                {/* Lista de Funciones Esenciales */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="list-outline" size={17} color={THEME.marca700} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900, textTransform: 'uppercase' }}>
                        Descripción de Funciones Esenciales
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                      Fuente: Planta Oficial y Resoluciones SJD
                    </Text>
                  </View>

                  <View style={{ gap: 10 }}>
                    {plazaEnriquecida?.funciones?.map((fn: string, idx: number) => (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: THEME.slate200,
                          padding: 12,
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: THEME.marca100,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 1,
                          }}
                        >
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.marca800 }}>
                            {idx + 1}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12.5, color: THEME.slate800, flex: 1, lineHeight: 18 }}>
                          {fn.replace(/^\d+[\.\-\)]\s*/, '')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* ========================================================= */}
            {/* TAB 3: REQUISITOS & PERFIL DE COMPETENCIAS               */}
            {/* ========================================================= */}
            {modalTab === 'requisitos' && (
              <ScrollView style={{ padding: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  Perfil de Competencias y Requisitos del Cargo
                </Text>

                {/* Referencia al Manual de Funciones */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FEF3C7',
                    borderColor: '#FDE68A',
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 14,
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="bookmark" size={15} color="#92400E" />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#92400E' }}>
                      Requisitos según Manual de Funciones:
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#78350F' }}>
                      {plazaEnriquecida?.manual_funciones || plazaEnriquecida?.resolucion_manual || 'Vigente'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#FDE68A', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#78350F' }}>PERFIL OFICIAL</Text>
                  </View>
                </View>

                {/* Tarjeta de Formación Académica */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#E0E7FF',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="school" size={17} color="#3730A3" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                        Formación Académica y Núcleo de Conocimiento
                      </Text>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                        Estudios reglamentarios para el nivel {plazaActiva?.nivel || 'jerárquico'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: THEME.slate50,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase', marginBottom: 4 }}>
                      Formación Académica y Títulos Exigidos:
                    </Text>
                    <Text style={{ fontSize: 13, color: THEME.slate800, lineHeight: 19 }}>
                      {(plazaEnriquecida as any)?.requisitos_formacion || plazaEnriquecida?.requisitos || 'No especificado'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Núcleo Básico (NBC)</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                        {plazaActiva?.nivel === 'DIRECTIVO' || plazaActiva?.nivel === 'ASESOR'
                          ? 'Derecho, Ciencias Sociales, Administración'
                          : plazaActiva?.nivel === 'PROFESIONAL'
                          ? 'Derecho, Ciencia Política, Economía, Sistemas'
                          : 'Bachillerato Técnico / Gestión Administrativa'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tarjeta de Experiencia Laboral y Profesional Exigida */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#FEF3C7',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="briefcase" size={17} color="#B45309" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                          Experiencia Laboral y Profesional Exigida
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                          Acreditación de experiencia según el nivel y grado
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setModalEditarPerfilVisible(true)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: pressed ? '#1E40AF' : '#2563EB',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                      })}
                    >
                      <Ionicons name="create-outline" size={13} color={THEME.white} />
                      <Text style={{ color: THEME.white, fontSize: 11.5, fontWeight: '700' }}>
                        Editar Formación / Experiencia
                      </Text>
                    </Pressable>
                  </View>

                  <View
                    style={{
                      backgroundColor: '#FFFBEB',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309', textTransform: 'uppercase', marginBottom: 4 }}>
                      Experiencia Requerida Oficial:
                    </Text>
                    <Text style={{ fontSize: 13, color: '#78350F', lineHeight: 19 }}>
                      {(plazaEnriquecida as any)?.requisitos_experiencia || 'No requiere experiencia previa o según reglamento.'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 140, backgroundColor: THEME.slate50, padding: 10, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                        Tipo de Experiencia
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.slate800, marginTop: 2 }}>
                        {(() => {
                          const expTexto = String((plazaEnriquecida as any)?.requisitos_experiencia || '').toLowerCase();
                          const meses = (plazaEnriquecida as any)?.meses_experiencia;
                          if (meses === 0 || expTexto.includes('no requiere') || expTexto.includes('sin experiencia')) {
                            return 'No Aplica (Sin experiencia exigida)';
                          }
                          return (plazaActiva?.nivel === 'PROFESIONAL' || plazaActiva?.nivel === 'ASESOR' || plazaActiva?.nivel === 'DIRECTIVO')
                            ? 'Profesional Relacionada'
                            : 'Laboral o Asistencial';
                        })()}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140, backgroundColor: THEME.slate50, padding: 10, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.slate500, textTransform: 'uppercase' }}>
                        Tiempo Estándar de Experiencia
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.marca700, marginTop: 2 }}>
                        {(() => {
                          const expTexto = String((plazaEnriquecida as any)?.requisitos_experiencia || '').toLowerCase();
                          const meses = (plazaEnriquecida as any)?.meses_experiencia;
                          if (meses === 0 || expTexto.includes('no requiere') || expTexto.includes('sin experiencia')) {
                            return 'No requiere experiencia previa';
                          }
                          if (typeof meses === 'number' && meses > 0) {
                            return `${meses} meses`;
                          }
                          if (plazaActiva?.nivel === 'DIRECTIVO') return '48 a 72 meses';
                          if (plazaActiva?.nivel === 'ASESOR') return '36 a 60 meses';
                          if (plazaActiva?.nivel === 'ASISTENCIAL') return 'No requiere experiencia previa';
                          return (Number(plazaActiva?.grado) || 0) >= 15 ? '24 a 36 meses' : '12 a 24 meses';
                        })()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tarjeta Competencias Comportamentales */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#FEF3C7',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="sparkles" size={17} color="#B45309" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                        Competencias Comportamentales Institucionales
                      </Text>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>
                        Decreto 1083 de 2015 & Manual SJD
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 8 }}>
                    {[
                      { titulo: 'Orientación a Resultados', desc: 'Cumplir metas con oportunidad y optimización de recursos distritales.' },
                      { titulo: 'Orientación al Usuario y al Ciudadano', desc: 'Prestar atención con calidez, imparcialidad y rigor jurídico.' },
                      { titulo: 'Transparencia e Integridad', desc: 'Actuar bajo principios éticos y salvaguarda del patrimonio público.' },
                      { titulo: 'Compromiso con la Organización', desc: 'Alinear el desempeño con los objetivos estratégicos de la Secretaría Jurídica.' },
                    ].map((comp, cIdx) => (
                      <View key={cIdx} style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: THEME.slate200 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.slate800 }}>• {comp.titulo}</Text>
                        <Text style={{ fontSize: 11, color: THEME.slate600, marginTop: 2 }}>{comp.desc}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* ========================================================= */}
            {/* TAB 4: SEGURIDAD SOCIAL & NÓMINA (PERNO)                   */}
            {/* ========================================================= */}
            {modalTab === 'perno' && (
              <ScrollView style={{ padding: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.marca700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  Seguridad Social Integral y Nómina (PERNO)
                </Text>

                {/* Afiliaciones a la Seguridad Social */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900, marginBottom: 12 }}>
                    Entidades Promotoras y Fondos de Afiliación
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 140, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', padding: 12, borderRadius: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="medical" size={15} color="#15803D" />
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
                          EPS / Salud
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#14532D' }}>
                        {plazaEnriquecida?.fondo_salud || 'No reportada'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', padding: 12, borderRadius: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="shield-checkmark" size={15} color="#1D4ED8" />
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#1E40AF', textTransform: 'uppercase' }}>
                          Fondo de Pensiones
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A8A' }}>
                        {plazaEnriquecida?.fondo_pension || 'No reportado'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', padding: 12, borderRadius: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="cash" size={15} color="#B45309" />
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#92400E', textTransform: 'uppercase' }}>
                          Fondo de Cesantías
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#78350F' }}>
                        {plazaEnriquecida?.fondo_cesantias || 'No reportado'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Nómina y Salarios */}
                <View
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.slate200,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900, marginBottom: 12 }}>
                    Asignación y Conceptos Salariales Mensuales
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Asignación Básica Mensual</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.emeraldText, marginTop: 2 }}>
                        {formatMoneda(plazaEnriquecida?.asignacion_basica)}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={{ fontSize: 11, color: THEME.slate500 }}>Total Devengado Mensual</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.marca800, marginTop: 2 }}>
                        {formatMoneda(plazaEnriquecida?.total_devengado)}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* ========================================================= */}
            {/* TAB 5: ESCALERA DE ENCARGOS                               */}
            {/* ========================================================= */}
            {modalTab === 'escalera' && (
              <ScrollView style={{ padding: 20 }}>
                {!plazaActiva?.id_escalera ? (
                  <View
                    style={{
                      backgroundColor: THEME.slate50,
                      borderWidth: 1,
                      borderColor: THEME.slate200,
                      borderRadius: 10,
                      padding: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: THEME.slate200,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Ionicons name="git-network-outline" size={26} color={THEME.slate500} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate800, textAlign: 'center' }}>
                      Esta plaza no registra Escalera de Encargos
                    </Text>
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: THEME.slate500,
                        textAlign: 'center',
                        marginTop: 6,
                        lineHeight: 18,
                        maxWidth: 500,
                      }}
                    >
                      En la plantilla oficial de Planta de Personal, las columnas ID-E y N identifican las escaleras y el número de peldaño correspondiente a la cadena de relevo por encargo.
                    </Text>
                    <Pressable
                      onPress={() => setModalTab('general')}
                      style={{
                        marginTop: 16,
                        backgroundColor: THEME.marca700,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.white }}>
                        Volver a la Ficha Técnica
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <View
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: THEME.slate200,
                        padding: 16,
                        marginBottom: 20,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#312E81' }}>
                        Cadena de Sucesión: Escalera #{plazaActiva.id_escalera} ({peldanosEscaleraModal.length} peldaños)
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.slate600, marginTop: 4 }}>
                        Toca cualquier peldaño para cargar su respectiva ficha técnica.
                      </Text>
                    </View>

                    <View style={{ gap: 8 }}>
                      {peldanosEscaleraModal.map((pel) => {
                        const esActual = pel.id_plaza === plazaActiva.id_plaza;
                        return (
                          <Pressable
                            key={pel.id_plaza}
                            onPress={() => setPlazaActiva(pel)}
                            style={{
                              backgroundColor: esActual ? '#EEF2FF' : THEME.white,
                              borderColor: esActual ? '#818CF8' : THEME.slate200,
                              borderWidth: esActual ? 2 : 1,
                              borderRadius: 8,
                              padding: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: esActual ? '#4338CA' : THEME.slate100,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: esActual ? THEME.white : THEME.slate700 }}>
                                  #{pel.peldano_escalera || 1}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>
                                  {pel.cargo} (Cód. {pel.codigo} Gr. {pel.grado})
                                </Text>
                                <Text style={{ fontSize: 11, color: THEME.slate500, marginTop: 1 }}>
                                  Plaza #{pel.id_plaza} · {pel.titular_nombre || 'Vacante'} {pel.encargo_nombre ? `(Encargo: ${pel.encargo_nombre})` : ''}
                                </Text>
                              </View>
                            </View>
                            {esActual ? (
                              <View style={{ backgroundColor: '#C7D2FE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#312E81' }}>Viendo Ahora</Text>
                              </View>
                            ) : (
                              <Ionicons name="chevron-forward" size={16} color={THEME.slate400} />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Pie del Modal */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: THEME.slate200,
                paddingHorizontal: 20,
                paddingVertical: 12,
                backgroundColor: THEME.slate50,
                alignItems: 'flex-end',
              }}
            >
              <Pressable
                onPress={onClose}
                style={{
                  backgroundColor: THEME.white,
                  borderWidth: 1,
                  borderColor: THEME.slate300,
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.slate700 }}>Cerrar Ficha</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal secundario para editar perfil / manual si se presiona el botón */}
      {modalEditarPerfilVisible && (
        <ModalPerfilCargo
          visible={modalEditarPerfilVisible}
          onClose={() => setModalEditarPerfilVisible(false)}
          cargoInicial={(plazaEnriquecida || plazaActiva) as any}
          idPlaza={plazaActiva?.id_plaza}
          onGuardadoExitoso={(datos) => {
            setModalEditarPerfilVisible(false);
            if (onGuardadoPerfil) onGuardadoPerfil(datos);
          }}
        />
      )}
    </>
  );
};
export default ModalFichaPlazaNomina;
