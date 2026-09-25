const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function setSuperadmin() {
  const targetEmail = process.argv[2] || 'admin@bogota.gov.co';

  try {
    const userRes = await pool.query('SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER($1)', [targetEmail]);
    
    if (userRes.rows.length === 0) {
      console.log(`❌ No se encontró usuario con el correo: ${targetEmail}`);
      console.log('Listado de usuarios disponibles con rol admin:');
      const admins = await pool.query("SELECT id, email, name, role FROM users WHERE role = 'admin'");
      console.table(admins.rows);
      return;
    }

    const user = userRes.rows[0];
    const updateRes = await pool.query(
      "UPDATE users SET role = 'superadmin' WHERE id = $1 RETURNING id, email, name, role",
      [user.id]
    );

    console.log('✅ Usuario promovido a Super Administrador exitosamente:');
    console.table(updateRes.rows);
  } catch (err) {
    console.error('❌ Error actualizando rol:', err.message);
  } finally {
    await pool.end();
  }
}

setSuperadmin();
