import * as XLSX from 'xlsx-js-style';
import { Platform } from 'react-native';

export interface ColumnDefinition {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  isPlate?: boolean;
  isStatus?: boolean;
}

export interface SheetOptions {
  sheetName: string;
  title: string;
  subtitle?: string;
  metaInfo?: string;
  columns: ColumnDefinition[];
  data: Record<string, any>[];
}

const COLOR_NAVY = '0F2042';
const COLOR_BLUE = '1E3A8A';
const COLOR_HEADER = '1E293B';
const COLOR_META_BG = 'F1F5F9';
const COLOR_ZEBRA_EVEN = 'F8FAFC';
const COLOR_WHITE = 'FFFFFF';
const COLOR_BORDER = 'CBD5E1';

const getStatusStyle = (val: string) => {
  const s = String(val || '').toUpperCase().trim();
  if (s.includes('RESUELTO') || s.includes('APROB') || s.includes('ACTIVO') || s.includes('DISPONIBLE') || s.includes('COMPLETAD')) {
    return { bg: 'DCFCE7', text: '166534' };
  }
  if (s.includes('PROCESO') || s.includes('ASIGNAD') || s.includes('FIJA') || s.includes('CURSO')) {
    return { bg: 'DBEAFE', text: '1E40AF' };
  }
  if (s.includes('PENDIENTE') || s.includes('ESPERA') || s.includes('ROTATIVO') || s.includes('LIBRE')) {
    return { bg: 'FEF3C7', text: '92400E' };
  }
  if (s.includes('RECHAZ') || s.includes('INACTIV') || s.includes('OCUPAD') || s.includes('CANCEL') || s.includes('SUSPEND')) {
    return { bg: 'FEE2E2', text: '991B1B' };
  }
  return null;
};

export function createStyledSheet(options: SheetOptions) {
  const { title, subtitle, metaInfo, columns, data } = options;
  const numCols = columns.length;
  const lastColIdx = numCols - 1;

  // Filas para la hoja:
  // Fila 0: Título Principal
  // Fila 1: Subtítulo
  // Fila 2: Metainfo
  // Fila 3: Espacio
  // Fila 4: Encabezados
  // Fila 5+: Datos
  const aoa: any[][] = [];

  const titleRow = new Array(numCols).fill('');
  titleRow[0] = title;
  aoa.push(titleRow);

  const subRow = new Array(numCols).fill('');
  subRow[0] = subtitle || 'Secretaría Jurídica Distrital — Sistema SASGE';
  aoa.push(subRow);

  const metaRow = new Array(numCols).fill('');
  metaRow[0] = metaInfo || `Generado el: ${new Date().toLocaleDateString('es-CO')} | Total Registros: ${data.length}`;
  aoa.push(metaRow);

  // Fila vacía
  aoa.push(new Array(numCols).fill(''));

  // Encabezados
  aoa.push(columns.map(c => c.header));

  // Datos
  data.forEach(item => {
    const row = columns.map(c => {
      const v = item[c.key];
      return v !== undefined && v !== null ? v : '';
    });
    aoa.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges para el encabezado
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIdx } }
  ];

  // Alturas de filas
  const rowsMeta: any[] = [
    { hpt: 30 }, // Título
    { hpt: 20 }, // Subtítulo
    { hpt: 18 }, // Metadatos
    { hpt: 8 },  // Espacio
    { hpt: 26 }, // Header
  ];

  for (let i = 0; i < data.length; i++) {
    rowsMeta.push({ hpt: 20 });
  }
  ws['!rows'] = rowsMeta;

  // Anchos automáticos de columna
  const colWidths = columns.map((c, colIdx) => {
    let maxLen = (c.header || '').length;
    data.forEach(row => {
      const valStr = String(row[c.key] ?? '');
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    const calculated = Math.max(maxLen + 4, c.width || 12);
    // Límite razonable entre 12 y 50
    return { wch: Math.min(Math.max(calculated, 12), 55) };
  });
  ws['!cols'] = colWidths;

  // Bordes estándar
  const standardBorder = {
    top: { style: 'thin', color: { rgb: COLOR_BORDER } },
    bottom: { style: 'thin', color: { rgb: COLOR_BORDER } },
    left: { style: 'thin', color: { rgb: COLOR_BORDER } },
    right: { style: 'thin', color: { rgb: COLOR_BORDER } }
  };

  // Estilizar Fila 0 (Título)
  const titleCellAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleCellAddr]) {
    ws[titleCellAddr].s = {
      font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: COLOR_WHITE } },
      fill: { fgColor: { rgb: COLOR_NAVY } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }

  // Estilizar Fila 1 (Subtítulo)
  const subCellAddr = XLSX.utils.encode_cell({ r: 1, c: 0 });
  if (ws[subCellAddr]) {
    ws[subCellAddr].s = {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: COLOR_WHITE } },
      fill: { fgColor: { rgb: COLOR_BLUE } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }

  // Estilizar Fila 2 (Metadatos)
  const metaCellAddr = XLSX.utils.encode_cell({ r: 2, c: 0 });
  if (ws[metaCellAddr]) {
    ws[metaCellAddr].s = {
      font: { name: 'Segoe UI', sz: 9, italic: true, color: { rgb: '475569' } },
      fill: { fgColor: { rgb: COLOR_META_BG } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        bottom: { style: 'thin', color: { rgb: COLOR_BORDER } }
      }
    };
  }

  // Estilizar Encabezados (Fila 4)
  for (let c = 0; c < numCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 4, c });
    if (ws[addr]) {
      ws[addr].s = {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: COLOR_WHITE } },
        fill: { fgColor: { rgb: COLOR_HEADER } },
        alignment: {
          horizontal: columns[c].align || 'center',
          vertical: 'center',
          wrapText: true
        },
        border: {
          top: { style: 'medium', color: { rgb: COLOR_NAVY } },
          bottom: { style: 'medium', color: { rgb: COLOR_NAVY } },
          left: { style: 'thin', color: { rgb: '334155' } },
          right: { style: 'thin', color: { rgb: '334155' } }
        }
      };
    }
  }

  // Estilizar Filas de Datos (Fila 5 en adelante)
  data.forEach((item, rowIdx) => {
    const r = 5 + rowIdx;
    const isEven = rowIdx % 2 === 1; // Fila alternada
    const defaultBg = isEven ? COLOR_ZEBRA_EVEN : COLOR_WHITE;

    columns.forEach((col, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) {
        ws[addr] = { t: 's', v: '' };
      }

      const val = String(item[col.key] ?? '');
      let cellBg = defaultBg;
      let fontColor = '1E293B';
      let isBold = false;
      let align = col.align || 'left';

      // 1. Caso Placa
      if (col.isPlate || col.key.toLowerCase().includes('placa')) {
        cellBg = 'FEF08A'; // Amarillo placa
        fontColor = '000000';
        isBold = true;
        align = 'center';
      }
      // 2. Caso Estado
      else if (col.isStatus || col.key.toLowerCase().includes('estado') || col.key.toLowerCase().includes('autorizacion')) {
        const st = getStatusStyle(val);
        if (st) {
          cellBg = st.bg;
          fontColor = st.text;
          isBold = true;
          align = 'center';
        }
      }
      // 3. Caso Código o ID
      else if (col.key.toLowerCase() === 'id' || col.key.toLowerCase().includes('codigo') || col.key.toLowerCase().includes('fecha')) {
        align = col.align || 'center';
      }

      ws[addr].s = {
        font: {
          name: 'Segoe UI',
          sz: 9.5,
          bold: isBold,
          color: { rgb: fontColor }
        },
        fill: { fgColor: { rgb: cellBg } },
        alignment: {
          horizontal: align,
          vertical: 'center',
          wrapText: true
        },
        border: standardBorder
      };
    });
  });

  return ws;
}

export function downloadWorkbook(workbook: any, fileName: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
