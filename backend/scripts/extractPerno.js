const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

function cleanText(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (!str || str.toLowerCase().includes('[object object]')) return '';

  if (/[ÃÂâ\u00C2\u00C3]/.test(str)) {
    try {
      const decoded = Buffer.from(str, 'latin1').toString('utf8');
      if (!decoded.includes('\uFFFD') && !/[ÃÂ\u00C2\u00C3]/.test(decoded)) {
        str = decoded;
      }
    } catch (e) {}
  }

  str = str
    .replace(/\u00C3[\u0080-\u009F]?\u0081|Ã[\u0080-\u009F]?\x81/g, 'Á')
    .replace(/\u00C3[\u0080-\u009F]?\u0089|Ã[\u0080-\u009F]?\x89/g, 'É')
    .replace(/\u00C3[\u0080-\u009F]?\u008D|Ã[\u0080-\u009F]?\x8D|Ã\s*D/g, (m) => m.includes('D') ? 'ÍD' : 'Í')
    .replace(/\u00C3[\u0080-\u009F]?\u0093|Ã[\u0080-\u009F]?\x93|Ã“|Ã”/g, 'Ó')
    .replace(/\u00C3[\u0080-\u009F]?\u009A|Ã[\u0080-\u009F]?\x9A|Ãš/g, 'Ú')
    .replace(/\u00C3[\u0080-\u009F]?\u0091|Ã[\u0080-\u009F]?\x91|Ã‘/g, 'Ñ')
    .replace(/\u00C3[\u0080-\u009F]?\u00A1|Ã¡/g, 'á')
    .replace(/\u00C3[\u0080-\u009F]?\u00A9|Ã©/g, 'é')
    .replace(/\u00C3[\u0080-\u009F]?\u00AD|Ã­|Ã\u00AD/g, 'í')
    .replace(/\u00C3[\u0080-\u009F]?\u00B3|Ã³/g, 'ó')
    .replace(/\u00C3[\u0080-\u009F]?\u00BA|Ãº/g, 'ú')
    .replace(/\u00C3[\u0080-\u009F]?\u00B1|Ã±/g, 'ñ')
    .replace(/\u00C2[\u0080-\u009F]?\u00BA|Âº/g, 'º')
    .replace(/\u00C2[\u0080-\u009F]?\u00B0|Â°/g, '°')
    .replace(/SUBSECRETARÃ[\x80-\x9F\s]?A/gi, 'SUBSECRETARÍA')
    .replace(/SECRETARÃ[\x80-\x9F\s]?A/gi, 'SECRETARÍA')
    .replace(/JURÃ[\x80-\x9F\s]?DICA/gi, 'JURÍDICA')
    .replace(/JURÃ[\x80-\x9F\s]?DICO/gi, 'JURÍDICO')
    .replace(/POLÃ[\x80-\x9F\s]?TICA/gi, 'POLÍTICA')
    .replace(/DIRECCIÃ[\x80-\x9F\s]?N/gi, 'DIRECCIÓN')
    .replace(/ADMINISTRACIÃ[\x80-\x9F\s]?N/gi, 'ADMINISTRACIÓN')
    .replace(/GESTIÃ[\x80-\x9F\s]?N/gi, 'GESTIÓN')
    .replace(/PLANEACIÃ[\x80-\x9F\s]?N/gi, 'PLANEACIÓN')
    .replace(/INSPECCIÃ[\x80-\x9F\s]?N/gi, 'INSPECCIÓN')
    .replace(/Ã[\x80-\x9F\s]?A/g, 'ÍA')
    .replace(/Ã[\x80-\x9F\s]?a/g, 'ía')
    .replace(/[\u0080-\u009F]/g, '');

  return str.replace(/\s+/g, ' ').trim();
}

function cleanDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.toISOString().split('T')[0];
  let num = typeof val === 'number' ? val : (typeof val === 'string' && /^\d{4,6}$/.test(val.trim()) ? parseFloat(val.trim()) : null);
  if (num && num > 1000 && num < 100000) {
    const msPerDay = 86400000;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + Math.round(num * msPerDay));
    return isNaN(jsDate.getTime()) ? null : jsDate.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  return null;
}

function cleanMoney(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).replace(/[\$,\s]/g, '').trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

async function run() {
  let filePath = path.resolve(__dirname, '../../Scratch/Plantilla_Planta_Perno_SJD.xlsx');
  if (!fs.existsSync(filePath)) {
    filePath = path.resolve(__dirname, '../../Scratch/PLANTA.xlsx');
  }
  console.log('Leyendo:', filePath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet('PLANTA PERNO');
  if (!ws) {
    console.error('No se encontró la hoja PLANTA PERNO en', filePath);
    return;
  }
  const list = [];
  
  for (let r = 10; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cedulaRaw = row.getCell(1).value;
    if (!cedulaRaw) continue;
    const cedula = String(cedulaRaw).trim();
    
    const ape1 = cleanText(row.getCell(2).value);
    const ape2 = cleanText(row.getCell(3).value);
    const nombres = cleanText(row.getCell(4).value);
    const nombreCompleto = [nombres, ape1, ape2].filter(Boolean).join(' ');
    const estadoFuncionario = String(row.getCell(5).value || '').trim().toUpperCase();
    const fechaRetiro = cleanDate(row.getCell(42).value);
    const esRetirado = estadoFuncionario === 'R' || !!fechaRetiro;
    
    const item = {
      cedula: cedula,
      primer_apellido: ape1,
      segundo_apellido: ape2,
      nombres: nombres,
      nombre_completo: nombreCompleto,
      estado_funcionario: esRetirado ? 'R' : 'A',
      estado_descripcion: esRetirado ? 'Retirado / Desvinculado' : 'Activo',
      fecha_nacimiento: cleanDate(row.getCell(6).value),
      direccion: cleanText(row.getCell(7).value),
      telefono: cleanText(row.getCell(8).value),
      sexo: cleanText(row.getCell(9).value),
      libreta_militar: cleanText(row.getCell(10).value),
      clase_libreta: cleanText(row.getCell(11).value),
      distrito_militar: cleanText(row.getCell(12).value),
      tipo_sangre: cleanText(row.getCell(13).value),
      rh: cleanText(row.getCell(14).value),
      tipo_funcionario: cleanText(row.getCell(15).value),
      fecha_ingreso_entidad: cleanDate(row.getCell(16).value),
      fecha_ingreso_distrito: cleanDate(row.getCell(17).value),
      fecha_ingreso_nacion: cleanDate(row.getCell(18).value),
      codigo_eps: cleanText(row.getCell(19).value),
      fondo_salud: cleanText(row.getCell(20).value),
      codigo_fondo_pensiones: cleanText(row.getCell(21).value),
      fondo_pension: cleanText(row.getCell(22).value),
      codigo_fondo_cesantias: cleanText(row.getCell(23).value),
      fondo_cesantias: cleanText(row.getCell(24).value),
      dependencia_cod: cleanText(row.getCell(25).value),
      dependencia: cleanText(row.getCell(26).value),
      cargo_cod: cleanText(row.getCell(27).value),
      grado: cleanText(row.getCell(28).value),
      asignacion_basica: cleanMoney(row.getCell(29).value),
      cargo: cleanText(row.getCell(30).value),
      posicion_planta: parseInt(String(row.getCell(31).value || ''), 10) || null,
      sede_cod: cleanText(row.getCell(32).value),
      sede: cleanText(row.getCell(33).value),
      tipo_nombramiento: cleanText(row.getCell(34).value),
      acto_nombramiento: cleanText(row.getCell(35).value),
      fecha_efectiva_nombramiento: cleanDate(row.getCell(36).value),
      numero_acto_nombramiento: cleanText(row.getCell(37).value),
      fecha_acto_nombramiento: cleanDate(row.getCell(38).value),
      fecha_efectiva_encargo: cleanDate(row.getCell(39).value),
      numero_acto_encargo: cleanText(row.getCell(40).value),
      fecha_acto_encargo: cleanDate(row.getCell(41).value),
      fecha_retiro: fechaRetiro,
      total_devengado: cleanMoney(row.getCell(43).value)
    };
    list.push(item);
  }
  
  const targetPath = path.resolve(__dirname, '../../frontend/lib/pernoMockData.json');
  fs.writeFileSync(targetPath, JSON.stringify(list, null, 2), 'utf-8');
  console.log(`Guardados ${list.length} registros en ${targetPath}`);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
