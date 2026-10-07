const fs = require('fs');

const lines = fs.readFileSync('scratch/idu_text.txt', 'utf8').split('\n');

const tramosMeta = [
  {
    num: 1,
    cargo: 'PROFESIONAL UNIVERSITARIO CÓDIGO 340 GRADO 03',
    dependencia: 'SUBDIRECCIÓN TÉCNICA PROCESOS JUDICIALES',
    periodo: '10/12/2003 al 16/01/2006',
    fecha_inicio: '2003-12-10',
    fecha_fin: '2006-01-16',
    resolucion: 'Resolución N° 6285 del 24 de julio de 2002',
    startLine: 60,
    endLine: 130
  },
  {
    num: 2,
    cargo: 'PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05',
    dependencia: 'SUBDIRECCIÓN TÉCNICA PROCESOS JUDICIALES',
    periodo: '17/01/2006 al 08/03/2006',
    fecha_inicio: '2006-01-17',
    fecha_fin: '2006-03-08',
    resolucion: 'Resolución N° 6285 del 24 de julio de 2002',
    startLine: 145,
    endLine: 205
  },
  {
    num: 3,
    cargo: 'PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05',
    dependencia: 'SUBDIRECCIÓN TÉCNICA PROCESOS JUDICIALES',
    periodo: '09/03/2006 al 23/04/2009',
    fecha_inicio: '2006-03-09',
    fecha_fin: '2009-04-23',
    resolucion: 'Resolución N° 1247 del 09 de marzo de 2006',
    startLine: 212,
    endLine: 255
  },
  {
    num: 4,
    cargo: 'PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05',
    dependencia: 'SUBDIRECCIÓN TÉCNICA PROCESOS JUDICIALES',
    periodo: '24/04/2009 al 02/03/2010',
    fecha_inicio: '2009-04-24',
    fecha_fin: '2010-03-02',
    resolucion: 'Resolución N° 1161 del 24 de abril de 2009',
    startLine: 261,
    endLine: 310
  },
  {
    num: 5,
    cargo: 'PROFESIONAL ESPECIALIZADO CÓDIGO 222 GRADO 05',
    dependencia: 'DIRECCIÓN TÉCNICA DE GESTIÓN JUDICIAL - SUBDIRECCIÓN GENERAL JURÍDICA',
    periodo: '03/03/2010 al 14/06/2012',
    fecha_inicio: '2010-03-03',
    fecha_fin: '2012-06-14',
    resolucion: 'Resolución N° 1161 del 24 de abril de 2009',
    startLine: 324,
    endLine: 375
  },
  {
    num: 6,
    cargo: 'DIRECTOR TÉCNICO CÓDIGO 009 GRADO 05 (E)',
    dependencia: 'DIRECCIÓN TÉCNICA DE GESTIÓN JUDICIAL',
    periodo: '21/02/2012 al 15/04/2012',
    fecha_inicio: '2012-02-21',
    fecha_fin: '2012-04-15',
    resolucion: 'Resolución N° 1161 del 24 de abril de 2009',
    startLine: 391,
    endLine: 470
  }
];

function extractFunctions(start, end) {
  const slice = lines.slice(start, end);
  const text = slice.join('\n');
  const items = [];
  // Expresión para buscar numeración: 1. Texto ...
  const regex = /(\d+)\.\s*([^\d]+(?:\d+(?!\.)[^\d]+)*)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1]);
    const fText = match[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (fText.length > 10 && !fText.startsWith('Resolución') && !fText.startsWith('Calle')) {
      items.push({ num, text: fText });
    }
  }
  return items;
}

tramosMeta.forEach(t => {
  const funcs = extractFunctions(t.startLine, t.endLine);
  console.log(`Tramo ${t.num} (${t.cargo}) - ${t.resolucion}: ${funcs.length} funciones encontradas.`);
  if (funcs.length > 0) {
    console.log(`  Primera: ${funcs[0].num}. ${funcs[0].text.substring(0, 60)}...`);
    console.log(`  Última:  ${funcs[funcs.length-1].num}. ${funcs[funcs.length-1].text.substring(0, 60)}...`);
  }
});
