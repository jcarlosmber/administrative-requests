const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
});

async function run() {
  console.log('--- INICIANDO EJECUCIÓN DE MIGRACIÓN DE PARQUEADERO Y RESTRICCIONES ---');
  console.log(`Conectando a base de datos "${process.env.PGDATABASE}" en host "${process.env.PGHOST}:${process.env.PGPORT || 5432}"...`);

  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, '../database/fix_parking_spots_constraints.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`El archivo SQL no existe en: ${sqlPath}`);
    }

    const fullSql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Leyendo script SQL (${fullSql.length} bytes)...`);

    console.log('Ejecutando script completo en una transacción...');
    await client.query(fullSql);

    console.log('✓ Script ejecutado exitosamente sin errores.');

    // Verificaciones de comprobación
    console.log('\n--- VERIFICANDO ESQUEMA Y COLUMNAS ---');
    const colsSpots = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'parking_spots' 
      ORDER BY ordinal_position
    `);
    console.log('Columnas en parking_spots:', colsSpots.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    const colsVehicles = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_vehicles' 
      ORDER BY ordinal_position
    `);
    console.log('Columnas en user_vehicles:', colsVehicles.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    const fkChecks = await client.query(`
      SELECT conname, confdeltype 
      FROM pg_constraint 
      WHERE conrelid = 'public.user_vehicles'::regclass 
        AND confrelid = 'public.parking_spots'::regclass
    `);
    console.log('Foreign keys user_vehicles -> parking_spots:', fkChecks.rows.map(r => `${r.conname} (delete rule: ${r.confdeltype === 'n' ? 'SET NULL' : r.confdeltype})`).join(', '));

    const sampleSpots = await client.query(`
      SELECT code, spot_type, vehicle_type, status, assigned_user_name 
      FROM public.parking_spots 
      ORDER BY code ASC 
      LIMIT 5
    `);
    console.log('\nMuestra de celdas:', sampleSpots.rows);

    console.log('\n✅ MIGRACIÓN FINALIZADA CON ÉXITO.');
  } catch (err) {
    console.error('❌ Error ejecutando la migración:', err.message);
    if (err.detail) console.error('Detalle:', err.detail);
    if (err.hint) console.error('Pista:', err.hint);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
