const fs = require('fs');
const path = require('path');
const JSZip = require('../backend/node_modules/jszip');

async function cleanWithJSZip() {
  const originalPath = path.join(__dirname, '3. 2311300-FT-318 Certificado de  1 oct.xlsx');
  const targetPath = path.join(__dirname, '../backend/templates/2311300-FT-318_template.xlsx');

  const data = fs.readFileSync(originalPath);
  const zip = await JSZip.loadAsync(data);

  console.log('Archivos en el ZIP original:', Object.keys(zip.files).length);

  // 1. Modificar sheet1.xml
  const sheetFile = zip.file('xl/worksheets/sheet1.xml');
  if (sheetFile) {
    let sheetXml = await sheetFile.async('string');
    sheetXml = sheetXml.replace(/<tableParts[^>]*>.*?<\/tableParts>/gs, '');
    zip.file('xl/worksheets/sheet1.xml', sheetXml);
    console.log('1. tableParts removido de sheet1.xml');
  }

  // 2. Modificar sheet1.xml.rels
  const sheetRelsFile = zip.file('xl/worksheets/_rels/sheet1.xml.rels');
  if (sheetRelsFile) {
    let sheetRelsXml = await sheetRelsFile.async('string');
    sheetRelsXml = sheetRelsXml.replace(/<Relationship[^>]*Target="\.\.\/tables\/table1\.xml"[^>]*\/>/g, '');
    zip.file('xl/worksheets/_rels/sheet1.xml.rels', sheetRelsXml);
    console.log('2. table1.xml removido de sheet1.xml.rels');
  }

  // 3. Eliminar xl/tables/table1.xml
  zip.remove('xl/tables/table1.xml');
  console.log('3. xl/tables/table1.xml eliminado');

  // 4. Modificar [Content_Types].xml
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml = await ctFile.async('string');
    ctXml = ctXml.replace(/<Override[^>]*PartName="\/xl\/tables\/table1\.xml"[^>]*\/>/g, '');
    zip.file('[Content_Types].xml', ctXml);
    console.log('4. [Content_Types].xml actualizado');
  }

  // 5. Modificar drawing1.xml: conservar únicamente Picture 1 (el logo institucional)
  const drawingFile = zip.file('xl/drawings/drawing1.xml');
  if (drawingFile) {
    let drawingXml = await drawingFile.async('string');
    const match = drawingXml.match(/(<xdr:wsDr[^>]*>.*?<\/xdr:twoCellAnchor>).*?<\/xdr:wsDr>/s);
    if (match) {
      drawingXml = match[1] + '</xdr:wsDr>';
      zip.file('xl/drawings/drawing1.xml', drawingXml);
      console.log('5. drawing1.xml limpiado: solo se conserva Picture 1 (logo)');
    }
  }

  // Generar nuevo buffer zip
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(targetPath, buffer);
  console.log('✓ Plantilla limpia guardada en:', targetPath, 'Size:', buffer.length);
}

cleanWithJSZip().catch(console.error);
