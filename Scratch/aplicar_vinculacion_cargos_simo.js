const fs = require('fs');

const simoMatch = fs.readFileSync('frontend/lib/reporteSimoData.ts', 'utf8').match(/export const REPORTES_SIMO_4_0_DATA: RegistroSimoOpec\[\] = (\[[\s\S]*?\]);/);
const simoData = JSON.parse(simoMatch[1]);
const plantaData = JSON.parse(fs.readFileSync('frontend/lib/plantaMockData.json', 'utf8'));

// Mapa oficial de vinculación verificado
const vinculos = {
  // Las 26 Disponibles (nuevo concurso) -> Plazas vacantes en planta
  8: 40,   // OPEC 228169 AUX SERV GEN 470-7 en Gestión Corporativa -> Plaza 40
  9: 39,   // OPEC 238023 SECRETARIO 440-9 en Política Jurídica -> Plaza 39
  10: 35,  // OPEC 238023 SECRETARIO 440-9 en Control Interno -> Plaza 35
  11: 34,  // OPEC 254169 SECRETARIO 440-11 en Planeación -> Plaza 34
  12: 42,  // OPEC 263315 AUX SERV GEN 470-3 en Gestión Corporativa -> Plaza 42
  13: 18,  // OPEC 264031 SECRETARIO 440-19 en Gestión Judicial -> Plaza 18
  14: 10,  // OPEC 264112 AUX ADM 407-26 en Disciplinarios -> Plaza 10
  31: 129, // OPEC 222793 PROF UNIV 219-15 en Disciplinarios -> Plaza 129
  32: 145, // OPEC 223181 PROF UNIV 219-1 en Política Jurídica -> Plaza 145
  33: 121, // OPEC 224312 PROF UNIV 219-18 en Política Jurídica -> Plaza 121
  34: 52,  // OPEC 228165 PROF ESP 222-27 en Gestión Corporativa -> Plaza 52
  35: 79,  // OPEC 229786 PROF ESP 222-24 en TIC -> Plaza 79
  36: 141, // OPEC 230462 PROF UNIV 219-8 en TIC -> Plaza 141
  37: 134, // OPEC 234160 PROF UNIV 219-13 en Control Interno -> Plaza 134
  38: 123, // OPEC 238025 PROF UNIV 219-18 en IVC -> Plaza 123
  39: 76,  // OPEC 245268 PROF ESP 222-26 en Gestión Judicial -> Plaza 76
  40: 117, // OPEC 246277 PROF UNIV 219-18 en Doctrina -> Plaza 117
  41: 130, // OPEC 246278 PROF UNIV 219-15 en IVC -> Plaza 130
  42: 105, // OPEC 246804 PROF UNIV 219-18 en Planeación -> Plaza 105
  43: 149, // OPEC 249019 PROF UNIV 219-1 en IVC -> Plaza 149
  44: 97,  // OPEC 261997 PROF ESP 222-21 en IVC -> Plaza 97
  45: 137, // OPEC 263025 PROF UNIV 219-10 en Control Interno -> Plaza 137
  46: 142, // OPEC 264040 PROF UNIV 219-8 en Gestión Corporativa -> Plaza 142
  49: 169, // OPEC 236227 TEC OPER 314-9 en Gestión Judicial -> Plaza 169
  50: 157, // OPEC 236228 TEC OPER 314-20 en IVC -> Plaza 157
  51: 162, // OPEC 246257 TEC OPER 314-15 en Gestión Judicial -> Plaza 162

  // Concursos previos que corresponden a vacantes definitivas
  4: 15,   // OPEC 170495 AUX ADM 407-20 en Despacho -> Plaza 15
  17: 60,  // OPEC 194527 PROF ESP 222-27 en Gestión Judicial -> Plaza 60
  18: 63,  // OPEC 194527 PROF ESP 222-27 en Gestión Judicial -> Plaza 63
  22: 116, // OPEC 196954 PROF UNIV 219-18 en Gestión Judicial -> Plaza 116
  26: 82,  // OPEC 203062 PROF ESP 222-24 en Doctrina -> Plaza 82
  48: 155  // OPEC 199731 TEC OPER 314-20 en Gestión Corporativa -> Plaza 155
};

// 1. Enriquecer los registros de SIMO
const simoActualizado = simoData.map(s => {
  const plazaId = vinculos[s.id];
  if (!plazaId) return s;

  const plaza = plantaData.find(p => p.id_plaza === plazaId);
  if (!plaza) return s;

  const tit = (plaza.titular_nombre || '').toUpperCase();
  const sit = (plaza.situacion_titular || '').toUpperCase();
  const est = (plaza.estado_cargo || '').toUpperCase();
  const esVac = tit.includes('VACANTE') || sit.includes('VACANTE') || est.includes('VACANTE');

  return {
    ...s,
    idPlazaVinculada: plaza.id_plaza,
    plazaVinculada: {
      idPlaza: plaza.id_plaza,
      denominacion: plaza.cargo,
      codigo: plaza.codigo,
      grado: plaza.grado,
      dependencia: plaza.dependencia_cargo,
      titular: plaza.titular_nombre || 'VACANTE DEFINITIVA',
      situacion: plaza.situacion_titular || 'VACANTE DEFINITIVA',
      encargo: plaza.encargo_nombre || null,
      tipoVinculacion: plaza.tipo_vinculacion || plaza.tipo_nombramiento || 'CARRERA ADMINISTRATIVA',
      asignacionBasica: plaza.asignacion_basica || '0',
      esVacanteDefinitiva: esVac
    }
  };
});

// 2. Actualizar plantaMockData con las OPECs correspondientes
let plazasActualizadas = 0;
plantaData.forEach(p => {
  const matchVinculo = Object.entries(vinculos).find(([sId, pId]) => pId === p.id_plaza);
  if (matchVinculo) {
    const s = simoData.find(x => x.id === Number(matchVinculo[0]));
    if (s && s.opec) {
      p.opec = String(s.opec).trim();
      p.proceso_seleccion_simo = s.estadoProvision === 'Disponible' 
        ? 'Convocatoria Distrito Capital 6 - CNSC (SIMO 4.0)'
        : 'Concurso de Méritos CNSC SIMO 4.0';
      p.fecha_reporte_simo = s.fechaRegistroSimo || '2024-05-15';
      plazasActualizadas++;
    }
  }
});

// Guardar plantaMockData.json
fs.writeFileSync('frontend/lib/plantaMockData.json', JSON.stringify(plantaData, null, 2), 'utf8');
console.log('Plazas actualizadas en plantaMockData.json:', plazasActualizadas);

// Regenerar reporteSimoData.ts
const tsContent = `/**
 * Archivo generado automáticamente a partir de reporte oficial SIMO 4.0 CNSC
 * Scratch/reports (1).xlsx - Secretaría Jurídica Distrital
 * Total registros: ${simoActualizado.length}
 * Sincronizado con planta de personal oficial SJD
 */

export type EstadoProvisionSimo =
  | 'Disponible'
  | 'Ofertado'
  | 'Provisto - Uso de Listas: ME'
  | 'Provisto - Uso de Listas: EE';

export interface PlazaVinculadaSimo {
  idPlaza: number;
  denominacion: string;
  codigo: string;
  grado: string;
  dependencia: string;
  titular: string;
  situacion: string;
  encargo: string | null;
  tipoVinculacion: string;
  asignacionBasica: string;
  esVacanteDefinitiva: boolean;
}

export interface RegistroSimoOpec {
  id: number;
  opec: string;
  idUnico: string;
  codigo: string;
  denominacion: string;
  nivel: string;
  grado: string;
  salario: number;
  vigenciaSalarial: string;
  proposito: string;
  esAscenso: boolean;
  idCargo: string;
  vacanteAscenso: boolean;
  fechaGeneracionVacante: string;
  fechaRegistroSimo: string;
  dependencia: string;
  municipio: string;
  departamento: string;
  estadoProvision: EstadoProvisionSimo;
  requisitoEstudio: string;
  requisitoExperiencia: string;
  funciones: string;
  idPlazaVinculada?: number;
  plazaVinculada?: PlazaVinculadaSimo;
}

export const ESTADOS_PROVISION_SIMO_CONFIG: Record<EstadoProvisionSimo, {
  label: string;
  descripcion: string;
  colorBg: string;
  colorText: string;
  colorBorder: string;
  badge: string;
  icono: string;
}> = {
  'Disponible': {
    label: 'Disponible',
    descripcion: 'Va para nuevo concurso de méritos',
    colorBg: '#FEF3C7',
    colorText: '#92400E',
    colorBorder: '#FCD34D',
    badge: 'NUEVO CONCURSO',
    icono: 'sparkles-outline'
  },
  'Ofertado': {
    label: 'Ofertado',
    descripcion: 'Ya se ofertó en el anterior concurso',
    colorBg: '#EFF6FF',
    colorText: '#1E40AF',
    colorBorder: '#BFDBFE',
    badge: 'CONCURSO ANTERIOR',
    icono: 'time-outline'
  },
  'Provisto - Uso de Listas: ME': {
    label: 'Provisto - Uso de Listas: ME',
    descripcion: 'Provisto por Mismo Empleo (Lista Elegibles)',
    colorBg: '#DCFCE7',
    colorText: '#166534',
    colorBorder: '#86EFAC',
    badge: 'LISTA ME',
    icono: 'ribbon-outline'
  },
  'Provisto - Uso de Listas: EE': {
    label: 'Provisto - Uso de Listas: EE',
    descripcion: 'Provisto por Empleo Equivalente (Lista Elegibles)',
    colorBg: '#F3E8FF',
    colorText: '#6B21A8',
    colorBorder: '#D8B4FE',
    badge: 'LISTA EE',
    icono: 'swap-horizontal-outline'
  }
};

export const REPORTES_SIMO_4_0_DATA: RegistroSimoOpec[] = ${JSON.stringify(simoActualizado, null, 2)};
`;

fs.writeFileSync('frontend/lib/reporteSimoData.ts', tsContent, 'utf8');
console.log('reporteSimoData.ts generado con éxito con plazas vinculadas.');
