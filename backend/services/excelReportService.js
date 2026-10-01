/**
 * Servicio de Generación de Reportes Excel para Dictamen de Ingreso y Experiencia
 */

const ExcelJS = require('exceljs');

async function generarReporteExcelValidacion(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Validación de Ingresos - SASGE';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Dictamen de Experiencia', {
    views: [{ showGridLines: true }]
  });

  // Estilos base
  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate oscuro
  };

  const headerFont = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };

  const titleFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF991B1B' } // Rojo/Vino institucional
  };

  // 1. TÍTULO GENERAL
  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'CUADRO TÉCNICO DE COTEJO Y VALIDACIÓN DE EXPERIENCIA LABORAL';
  titleCell.fill = titleFill;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // 2. DATOS DEL CARGO Y CANDIDATO
  const candidato = data.candidato || {};
  const cargo = data.cargo_evaluado || {};
  const consolidado = data.consolidado || {};

  sheet.addRow([]);
  sheet.addRow(['DATOS DEL PROCESO DE EVALUACIÓN']);
  sheet.getCell('A3').font = { bold: true, size: 12 };

  const datosInfo = [
    ['Candidato / Aspirante:', candidato.nombre || 'N/A', '', 'Documento de Identidad:', candidato.documento || 'N/A'],
    ['Cargo Evaluado:', cargo.nombre || 'N/A', '', 'Código y Grado:', `${cargo.codigo || ''} - ${cargo.grado || ''}`],
    ['Dependencia:', cargo.dependencia || 'N/A', '', 'Requisito Mínimo:', `${consolidado.requisito_minimo_meses || 54} Meses`],
    ['Experiencia Relacionada Neta:', `${consolidado.experiencia_relacionada_meses || 0} Meses`, '', 'Tiempo Excluido por Traslapes:', `${consolidado.tiempo_excluido_por_traslapes_meses || 0} Meses`],
    ['Diferencia frente al Requisito:', `${consolidado.diferencia_meses >= 0 ? '+' : ''}${consolidado.diferencia_meses || 0} Meses`, '', 'DICTAMEN FINAL:', consolidado.resultado_final || 'REQUIERE_REVISION']
  ];

  datosInfo.forEach(row => {
    const r = sheet.addRow(row);
    r.font = { name: 'Calibri', size: 11 };
  });

  // Colorear el Dictamen Final
  const dictamenCell = sheet.getCell('E8');
  dictamenCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  if (consolidado.resultado_final === 'CUMPLE') {
    dictamenCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }; // Verde
  } else if (consolidado.resultado_final === 'NO_CUMPLE') {
    dictamenCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }; // Rojo
  } else {
    dictamenCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } }; // Ámbar
  }

  sheet.addRow([]);

  // 3. TABLA DETALLADA DE CERTIFICADOS
  sheet.addRow(['DETALLE DE CERTIFICADOS Y COTEJO DE FUNCIONES']);
  sheet.getCell(`A${sheet.lastRow.number}`).font = { bold: true, size: 12 };

  const tableHeaders = [
    'ID Cert.',
    'Entidad Emisora',
    'Cargo Desempeñado',
    'Fecha Inicio',
    'Fecha Fin',
    'Tiempo Certificado',
    'Clasificación Funcional',
    'Traslapes Detectados',
    'Funciones Coincidentes (Evidencia Textual)',
    'Estado Documento'
  ];

  const headerRow = sheet.addRow(tableHeaders);
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  const certificados = data.certificados || [];
  certificados.forEach((c) => {
    const tiempoTxt = `${c.tiempo_certificado?.meses_totales_aproximados || 0} meses (${c.tiempo_certificado?.anios || 0}a, ${c.tiempo_certificado?.meses || 0}m, ${c.tiempo_certificado?.dias || 0}d)`;

    const traslapeTxt = (c.traslapes && c.traslapes.length > 0)
      ? c.traslapes.map(t => t.explicacion).join('\n')
      : 'Sin traslapes';

    const funcionesTxt = (c.experiencia_relacionada?.funciones_coincidentes || [])
      .map(f => `• [${f.coincidencia || 'COINCIDENCIA'}] Función Cargo: ${f.funcion_del_cargo || ''}\n  Certificado: "${f.evidencia_textual || f.funcion_certificada || ''}"\n  Justificación: ${f.justificacion || ''}`)
      .join('\n\n');

    const estadoDoc = c.documento?.estado === 'COMPLETO' ? 'Completo / Legible' : 'Requiere Revisión / Incompleto';

    const row = sheet.addRow([
      c.id_certificado || 'N/A',
      c.entidad || 'N/A',
      c.cargo_certificado || 'N/A',
      c.fecha_inicio || 'NO CONSTA',
      c.fecha_fin || (c.vinculo_vigente ? 'Vigente' : 'NO CONSTA'),
      tiempoTxt,
      c.clasificacion_experiencia || c.experiencia_relacionada?.resultado || 'NO DETERMINABLE',
      traslapeTxt,
      funcionesTxt || 'No se registraron coincidencias directas con el cargo.',
      estadoDoc
    ]);

    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  });

  // 4. OBSERVACIONES Y JUSTIFICACIÓN FINAL
  sheet.addRow([]);
  sheet.addRow(['JUSTIFICACIÓN TÉCNICA DEL DICTAMEN:']);
  sheet.getCell(`A${sheet.lastRow.number}`).font = { bold: true };

  const justRow = sheet.addRow([consolidado.justificacion || 'Sin justificación registrada.']);
  sheet.mergeCells(`A${justRow.number}:J${justRow.number + 1}`);
  sheet.getCell(`A${justRow.number}`).alignment = { vertical: 'top', wrapText: true };

  // Ajustar anchos de columnas
  sheet.columns = [
    { width: 12 }, // ID
    { width: 26 }, // Entidad
    { width: 24 }, // Cargo
    { width: 14 }, // Inicio
    { width: 14 }, // Fin
    { width: 18 }, // Tiempo
    { width: 20 }, // Clasificación
    { width: 26 }, // Traslapes
    { width: 45 }, // Funciones
    { width: 20 }  // Estado Doc
  ];

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  generarReporteExcelValidacion
};
