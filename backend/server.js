const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const ldapClient = require('./ldapClient');


const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Middlewares
app.use(cors());
app.use(express.json());

// Middleware para manejar errores de JSON malformado en el body
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'El cuerpo de la solicitud contiene un JSON malformado.' });
  }
  next();
});

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Middleware de Autenticación JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso no proporcionado.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    req.user = user;
    next();
  });
};

// --- ENDPOINTS DE AUTENTICACIÓN ---

// Registro de usuario
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email.toLowerCase(), passwordHash, name, role || 'funcionario']
    );

    const newUser = result.rows[0];
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor al registrar usuario.' });
  }
});

// Inicio de sesión (Híbrido: Local + LDAP)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'El correo y la contraseña son requeridos.' });
  }

  try {
    const emailLower = email.trim().toLowerCase();
    
    // Buscar si el usuario existe localmente (por correo o por usuario de red) de manera insensible a mayúsculas/minúsculas
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $2', 
      [emailLower, emailLower]
    );

    let user = result.rows[0];

    if (user) {
      if (user.ldap_enabled) {
        // Autenticación contra LDAP/Directorio Activo
        console.log(`Iniciando sesión con LDAP para el usuario: ${email}`);
        const ldapResult = await ldapClient.authenticate(email, password);
        
        if (!ldapResult.success) {
          return res.status(400).json({ error: ldapResult.reason || 'Credenciales de Directorio Activo inválidas.' });
        }

        // Sincronizar datos de LDAP en la base de datos local
        const ldapUser = ldapResult.user;
        const updateResult = await pool.query(
          'UPDATE users SET name = $1, dependency = $2 WHERE id = $3 RETURNING *',
          [ldapUser.name, ldapUser.dependency, user.id]
        );
        user = updateResult.rows[0];
      } else {
        // Autenticación Local con bcrypt
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
          return res.status(400).json({ error: 'Credenciales inválidas.' });
        }
      }
    } else {
      // Si el usuario no existe localmente, intentamos autenticación LDAP para registro dinámico (primer ingreso)
      console.log(`Usuario no encontrado localmente. Intentando autenticación LDAP/AD para: ${email}`);
      try {
        const ldapResult = await ldapClient.authenticate(email, password);
        
        if (!ldapResult.success) {
          return res.status(400).json({ error: 'Credenciales inválidas.' });
        }

        // Crear usuario automáticamente (sincronización) en la base de datos
        const ldapUser = ldapResult.user;
        const insertResult = await pool.query(
          'INSERT INTO users (email, username, name, dependency, ldap_enabled, role) VALUES ($1, $2, $3, $4, true, $5) RETURNING *',
          [
            ldapUser.email.toLowerCase(), 
            ldapUser.username.toLowerCase(), 
            ldapUser.name, 
            ldapUser.dependency, 
            'funcionario'
          ]
        );
        user = insertResult.rows[0];
        console.log(`Usuario LDAP registrado y sincronizado localmente: ${user.email}`);
      } catch (ldapErr) {
        console.error('Error al intentar autenticar con LDAP:', ldapErr.message);
        return res.status(400).json({ error: 'Credenciales inválidas o servicio LDAP no disponible.' });
      }
    }

    // Generación del token JWT de sesión
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        username: user.username,
        dependency: user.dependency,
        ldap_enabled: user.ldap_enabled
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
});

// Obtener información del usuario logueado
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener datos del usuario.' });
  }
});

// --- ENDPOINTS DE SOLICITUDES ADMINISTRATIVAS ---

// Obtener todas las solicitudes del usuario actual (o todas si es admin)
app.get('/api/requests', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM administrative_requests ORDER BY created_at DESC');
    } else {
      result = await pool.query('SELECT * FROM administrative_requests WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener solicitudes.' });
  }
});

// Crear una nueva solicitud
app.post('/api/requests', authenticateToken, async (req, res) => {
  const { title, description, category, priority, attachments, metadata } = req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Título, descripción y categoría son requeridos.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO administrative_requests (user_id, title, description, category, priority, attachments, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, title, description, category, priority || 'media', attachments || [], metadata || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la solicitud.' });
  }
});

// Actualizar una solicitud (los usuarios solo pueden actualizar si está pendiente, admin puede cambiar todo incl. estado)
app.put('/api/requests/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, status, admin_notes, metadata } = req.body;

  try {
    // Verificar propiedad y estado
    const checkResult = await pool.query('SELECT * FROM administrative_requests WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const request = checkResult.rows[0];

    if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para modificar esta solicitud.' });
    }

    if (req.user.role !== 'admin' && request.status !== 'pendiente') {
      return res.status(400).json({ error: 'No se puede modificar una solicitud que ya no está pendiente.' });
    }

    let query;
    let params;

    if (req.user.role === 'admin') {
      query = `UPDATE administrative_requests 
               SET title = COALESCE($1, title), 
                   description = COALESCE($2, description), 
                   priority = COALESCE($3, priority), 
                   status = COALESCE($4, status), 
                   admin_notes = COALESCE($5, admin_notes),
                   metadata = COALESCE($6, metadata)
               WHERE id = $7 RETURNING *`;
      params = [title, description, priority, status, admin_notes, metadata, id];
    } else {
      query = `UPDATE administrative_requests 
               SET title = COALESCE($1, title), 
                   description = COALESCE($2, description), 
                   priority = COALESCE($3, priority),
                   metadata = COALESCE($4, metadata)
               WHERE id = $5 AND status = 'pendiente' RETURNING *`;
      params = [title, description, priority, metadata, id];
    }

    const updateResult = await pool.query(query, params);
    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la solicitud.' });
  }
});

// Eliminar una solicitud
app.delete('/api/requests/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const checkResult = await pool.query('SELECT * FROM administrative_requests WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const request = checkResult.rows[0];

    if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta solicitud.' });
    }

    await pool.query('DELETE FROM administrative_requests WHERE id = $1', [id]);
    res.json({ message: 'Solicitud eliminada correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la solicitud.' });
  }
});

// --- ENDPOINTS DE VEHÍCULOS ---

// Obtener vehículos del usuario
app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_vehicles WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener vehículos.' });
  }
});

// Crear un vehículo
app.post('/api/vehicles', authenticateToken, async (req, res) => {
  const { plate, brand, model, color, name, doc, dependency } = req.body;
  if (!plate || !brand) {
    return res.status(400).json({ error: 'Placa y marca son obligatorios.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO user_vehicles (user_id, plate, brand, model, color, name, doc, dependency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.id, plate, brand, model || null, color || null, name || null, doc || null, dependency || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el vehículo.' });
  }
});

// Actualizar un vehículo
app.put('/api/vehicles/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { plate, brand, model, color, name, doc, dependency } = req.body;

  try {
    const checkResult = await pool.query('SELECT * FROM user_vehicles WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado.' });
    }

    if (checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este vehículo.' });
    }

    const result = await pool.query(
      `UPDATE user_vehicles 
       SET plate = COALESCE($1, plate), 
           brand = COALESCE($2, brand), 
           model = COALESCE($3, model), 
           color = COALESCE($4, color),
           name = COALESCE($5, name),
           doc = COALESCE($6, doc),
           dependency = COALESCE($7, dependency)
       WHERE id = $8 RETURNING *`,
      [plate, brand, model, color, name, doc, dependency, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el vehículo.' });
  }
});

// Eliminar un vehículo
app.delete('/api/vehicles/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const checkResult = await pool.query('SELECT * FROM user_vehicles WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado.' });
    }

    if (checkResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este vehículo.' });
    }

    await pool.query('DELETE FROM user_vehicles WHERE id = $1', [id]);
    res.json({ message: 'Vehículo eliminado correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el vehículo.' });
  }
});

// Inicialización
app.listen(PORT, () => {
  console.log(`Servidor API local corriendo en http://localhost:${PORT}`);
});
