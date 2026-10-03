const fs = require('fs');
const path = require('path');
const cp = require('child_process');

async function cleanTemplate() {
  const scratchDir = path.join(__dirname);
  const sourceZip = path.join(scratchDir, 'template_source.zip');
  const extractDir = path.join(scratchDir, 'clean_extract');
  const cleanedZip = path.join(scratchDir, 'clean_result.zip');
  const finalXlsx = path.join(__dirname, '../backend/templates/2311300-FT-318_template.xlsx');

  // 1. Copiar original como zip
  fs.copyFileSync(path.join(__dirname, '3. 2311300-FT-318 Certificado de  1 oct.xlsx'), sourceZip);

  // 2. Extraer
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  cp.execSync(`powershell -Command "Expand-Archive -Path '${sourceZip}' -DestinationPath '${extractDir}' -Force"`);
  console.log('1. Plantilla extraída');

  // 3. Modificar sheet1.xml: eliminar tableParts
  const sheetPath = path.join(extractDir, 'xl/worksheets/sheet1.xml');
  if (fs.existsSync(sheetPath)) {
    let sheetXml = fs.readFileSync(sheetPath, 'utf8');
    sheetXml = sheetXml.replace(/<tableParts[^>]*>.*?<\/tableParts>/gs, '');
    fs.writeFileSync(sheetPath, sheetXml, 'utf8');
    console.log('2. tableParts eliminado de sheet1.xml');
  }

  // 4. Modificar sheet1.xml.rels: eliminar relación a table1.xml
  const sheetRelsPath = path.join(extractDir, 'xl/worksheets/_rels/sheet1.xml.rels');
  if (fs.existsSync(sheetRelsPath)) {
    let relsXml = fs.readFileSync(sheetRelsPath, 'utf8');
    relsXml = relsXml.replace(/<Relationship[^>]*Target="\.\.\/tables\/table1\.xml"[^>]*\/>/g, '');
    fs.writeFileSync(sheetRelsPath, relsXml, 'utf8');
    console.log('3. Relación table1.xml eliminada de sheet1.xml.rels');
  }

  // 5. Eliminar xl/tables
  const tablesDir = path.join(extractDir, 'xl/tables');
  if (fs.existsSync(tablesDir)) {
    fs.rmSync(tablesDir, { recursive: true, force: true });
    console.log('4. Carpeta xl/tables eliminada');
  }

  // 6. Modificar [Content_Types].xml
  const contentTypesPath = path.join(extractDir, '[Content_Types].xml');
  if (fs.existsSync(contentTypesPath)) {
    let ctXml = fs.readFileSync(contentTypesPath, 'utf8');
    ctXml = ctXml.replace(/<Override[^>]*PartName="\/xl\/tables\/table1\.xml"[^>]*\/>/g, '');
    fs.writeFileSync(contentTypesPath, ctXml, 'utf8');
    console.log('5. Content_Types limpiado');
  }

  // 7. Modificar drawing1.xml: conservar solo Picture 1 (Logo institucional)
  const drawingPath = path.join(extractDir, 'xl/drawings/drawing1.xml');
  if (fs.existsSync(drawingPath)) {
    let drawingXml = fs.readFileSync(drawingPath, 'utf8');
    const match = drawingXml.match(/(<xdr:wsDr[^>]*>.*?<\/xdr:twoCellAnchor>).*?<\/xdr:wsDr>/s);
    if (match) {
      drawingXml = match[1] + '</xdr:wsDr>';
      fs.writeFileSync(drawingPath, drawingXml, 'utf8');
      console.log('6. drawing1.xml limpiado: solo Picture 1 conservado');
    }
  }

  // 8. Recomprimir usando .NET ZipFile (garantiza estructura interna estándar de Office)
  if (fs.existsSync(cleanedZip)) {
    fs.unlinkSync(cleanedZip);
  }
  const psZipCmd = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${extractDir}', '${cleanedZip}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
  cp.execSync(psZipCmd);
  console.log('7. Recomprimido con .NET ZipFile a clean_result.zip');

  // 9. Guardar como backend/templates/2311300-FT-318_template.xlsx
  fs.copyFileSync(cleanedZip, finalXlsx);
  console.log('8. Plantilla oficial actualizada en:', finalXlsx);
}

cleanTemplate().catch(console.error);
