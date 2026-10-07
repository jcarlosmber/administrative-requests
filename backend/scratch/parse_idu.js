const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'C:/Users/jcarl/.gemini/antigravity-ide/brain/bb614117-9efa-4ff0-a4f5-791ad70df487/.user_uploaded/media_1791340533365.pdf';

async function run() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  console.log('Total páginas:', data.numpages);
  fs.writeFileSync('C:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/backend/scratch/idu_text.txt', data.text);
  console.log('Texto guardado en scratch/idu_text.txt. Longitud:', data.text.length);
}

run().catch(console.error);
