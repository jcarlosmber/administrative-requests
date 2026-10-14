const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({}); // mock pool

const nominaRoutes = require('../routes/nominaRoutes')(pool);
app.use('/api/nomina', nominaRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.originalUrl}` });
});

const server = app.listen(3099, async () => {
  console.log('Test server listening on 3099');
  try {
    const res = await fetch('http://localhost:3099/api/nomina/manuales/5023');
    console.log('Status:', res.status, 'Content-Type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Body:', text.substring(0, 200));
  } catch (err) {
    console.error('Fetch err:', err);
  } finally {
    server.close();
  }
});
