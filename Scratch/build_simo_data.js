const fs = require('fs');
const path = require('path');
const xlsx = require(path.resolve(__dirname, '../frontend/node_modules/xlsx'));

const wb = xlsx.readFile('Scratch/reports (1).xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

function excelDateToString(serial) {
  if (!serial) return '';
  if (typeof serial === 'string') return serial.trim();
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

const records = [];
for (let i = 5; i < data.length; i++) {
  const row = data[i];
  if (!row || !row[3]) continue;
  records.push({
    id: i - 4,
    opec: String(row[3]).trim(),
    idUnico: String(row[4] || '').trim(),
    codigo: String(row[5] || '').trim(),
    denominacion: String(row[6] || '').trim(),
    nivel: String(row[8] || '').trim(),
    grado: String(row[9] || '').trim(),
    salario: Number(row[10]) || 0,
    vigenciaSalarial: String(row[11] || '').trim(),
    proposito: String(row[12] || '').trim(),
    esAscenso: row[13] === true || row[13] === 'true' || row[13] === 'TRUE',
    idCargo: String(row[14] || '').trim(),
    vacanteAscenso: row[15] === true || row[15] === 'true' || row[15] === 'TRUE',
    fechaGeneracionVacante: excelDateToString(row[16]),
    fechaRegistroSimo: excelDateToString(row[17]),
    dependencia: String(row[18] || '').trim(),
    municipio: String(row[19] || 'BOGOTÁ D.C.').trim(),
    departamento: String(row[20] || 'BOGOTÁ D.C.').trim(),
    estadoProvision: String(row[21] || '').trim(),
    requisitoEstudio: String(row[22] || '').trim(),
    requisitoExperiencia: String(row[23] || '').trim(),
    funciones: String(row[26] || '').trim(),
  });
}

const content = `/**
 * Archivo generado automáticamente a partir de reporte oficial SIMO 4.0 CNSC
 * Scratch/reports (1).xlsx - Secretaría Jurídica Distrital
 * Total registros: ${records.length}
 */

export type EstadoProvisionSimo =
  | 'Disponible'
  | 'Ofertado'
  | 'Provisto - Uso de Listas: ME'
  | 'Provisto - Uso de Listas: EE';

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

export const REPORTES_SIMO_4_0_DATA: RegistroSimoOpec[] = ${JSON.stringify(records, null, 2)};
`;

fs.writeFileSync('frontend/lib/reporteSimoData.ts', content, 'utf8');
console.log('Successfully generated frontend/lib/reporteSimoData.ts with ' + records.length + ' records.');
