const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const ldapClient = require('./ldapClient');
const emailService = require('./emailService');


const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Middlewares
app.use(cors());
app.use(express.json());

// Workaround para WAF: Si recibimos POST pero con X-HTTP-Method-Override,
// cambiamos internamente el req.method para engañar a Express y al WAF.
app.use((req, res, next) => {
  const methodOverride = req.headers['x-http-method-override'];
  if (req.method === 'POST' && methodOverride) {
    req.method = methodOverride.toUpperCase();
  }
  next();
});

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

// Función para inicializar base de datos y migrar esquema
const initDatabase = async () => {
  try {
    // 1. Crear tablas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.dependencies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS public.rooms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          capacity INTEGER NOT NULL,
          floor TEXT,
          info TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.drivers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.service_emails (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service_type TEXT NOT NULL,
          email TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.system_settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL
      );
    `);

    // 2. Modificaciones a la tabla users para estar alineada con profiles
    const columnsToEnsure = [
      { name: 'full_name', type: 'TEXT' },
      { name: 'first_name', type: 'TEXT' },
      { name: 'last_name', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'entity', type: 'TEXT' },
      { name: 'is_active', type: 'BOOLEAN DEFAULT true' },
      { name: 'start_date', type: 'DATE' },
      { name: 'end_date', type: 'DATE' },
      { name: 'dependency_id', type: 'UUID' }
    ];

    for (const col of columnsToEnsure) {
      await pool.query(`
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
      `).catch(err => console.error(`Error al agregar columna ${col.name}:`, err.message));
    }

    // Asegurar dependencias iniciales si está vacío
    const depCheck = await pool.query('SELECT COUNT(*) FROM public.dependencies');
    if (parseInt(depCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO public.dependencies (name) VALUES 
        ('Secretaría Jurídica Distrital'),
        ('Dirección de Gestión Corporativa'),
        ('Subdirección de Informática'),
        ('Dirección Distrital de Asuntos Penales'),
        ('Oficina Asesora de Planeación')
        ON CONFLICT (name) DO NOTHING;
      `);
    }

    // Asegurar salas iniciales si está vacío
    const roomCheck = await pool.query('SELECT COUNT(*) FROM public.rooms');
    if (parseInt(roomCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO public.rooms (name, capacity, floor, info) VALUES 
        ('Sala Innovación', 12, 'Piso 2', 'Ala Norte'),
        ('Sala de Juntas B', 8, 'Piso 1', 'Cerca a Recepción'),
        ('Focus Room 4', 2, 'Piso 3', 'Zona Silenciosa'),
        ('Auditorio Principal', 50, 'PB', 'Salón Principal');
      `);
    }

    // Asegurar configuración de evaluación inicial
    const settingsCheck = await pool.query("SELECT COUNT(*) FROM public.system_settings WHERE key = 'eval_categories'");
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO public.system_settings (key, value) VALUES 
        ('eval_categories', '["visitors", "transport", "maintenance", "rooms", "parking"]')
        ON CONFLICT (key) DO NOTHING;
      `);
    }

    console.log('Base de datos inicializada y migrada exitosamente.');
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err);
  }
};

initDatabase();


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

// --- ENDPOINTS DE CONFIGURACIÓN DEL SISTEMA ---
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query('SELECT value FROM public.system_settings WHERE key = $1', [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada.' });
    }
    res.json(result.rows[0].value);
  } catch (err) {
    console.error('Error obteniendo configuración:', err);
    res.status(500).json({ error: 'Error del servidor.' });
  }
});

app.put('/api/settings/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    // Solo admins pueden modificar configuración general
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permisos insuficientes.' });
    }

    const result = await pool.query(
      'INSERT INTO public.system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value RETURNING *',
      [key, JSON.stringify(value)]
    );
    res.json(result.rows[0].value);
  } catch (err) {
    console.error('Error actualizando configuración:', err);
    res.status(500).json({ error: 'Error del servidor.' });
  }
});

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
    const simpleUsername = emailLower.split('@')[0];
    
    // Buscar si el usuario existe localmente (por correo o por usuario de red) de manera insensible a mayúsculas/minúsculas
    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $2 OR SPLIT_PART(LOWER(email), '@', 1) = $3 LIMIT 1", 
      [emailLower, emailLower, simpleUsername]
    );

    let user = result.rows[0];

    if (user) {
      if (user.ldap_enabled) {
        // Autenticación contra LDAP/Directorio Activo
        console.log(`Iniciando sesión con LDAP para el usuario: ${email}`);
        try {
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
        } catch (ldapErr) {
          console.error('Error al autenticar usuario LDAP existente:', ldapErr.message);
          return res.status(400).json({ error: 'No se pudo conectar con el Directorio Activo (LDAP). Verifica tu conexión o red institucional.' });
        }
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
    const result = await pool.query('SELECT id, email, name, role, dependency, username, ldap_enabled FROM users WHERE id = $1', [req.user.id]);
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

// Obtener disponibilidad de salas (todas las reservas de salas no rechazadas, sin exponer datos sensibles)
app.get('/api/requests/rooms/availability', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, metadata, status FROM administrative_requests WHERE category = 'rooms' AND status != 'rechazado'"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener disponibilidad de salas.' });
  }
});

// Obtener todas las solicitudes del usuario actual (o todas si es admin)
app.get('/api/requests', authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT ar.*, u.name as user_name FROM administrative_requests ar LEFT JOIN users u ON ar.user_id = u.id ORDER BY ar.created_at DESC');
    } else {
      result = await pool.query('SELECT ar.*, u.name as user_name FROM administrative_requests ar LEFT JOIN users u ON ar.user_id = u.id WHERE ar.user_id = $1 ORDER BY ar.created_at DESC', [req.user.id]);
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
    
    // Obtener información del usuario para enviar el correo de notificación
    const createdRequest = result.rows[0];
    const userResult = await pool.query('SELECT name, full_name, first_name, last_name, email FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length > 0) {
      const u = userResult.rows[0];
      const displayName = u.full_name || (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : null) || u.name;
      u.name = displayName;
      emailService.sendRequestCreatedNotification(u, createdRequest);
    }

    res.status(201).json(createdRequest);
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
    const metaParam = metadata !== undefined ? JSON.stringify(metadata) : null;

    if (req.user.role === 'admin') {
      query = `UPDATE administrative_requests 
               SET title = COALESCE($1, title), 
                   description = COALESCE($2, description), 
                   priority = COALESCE($3, priority), 
                   status = COALESCE($4, status), 
                   admin_notes = COALESCE($5, admin_notes),
                   metadata = COALESCE($6::jsonb, metadata)
               WHERE id = $7 RETURNING *`;
      params = [title ?? null, description ?? null, priority ?? null, status ?? null, admin_notes ?? null, metaParam ?? null, id];
    } else {
      query = `UPDATE administrative_requests 
               SET title = COALESCE($1, title), 
                   description = COALESCE($2, description), 
                   priority = COALESCE($3, priority),
                   metadata = COALESCE($4::jsonb, metadata)
               WHERE id = $5 AND status = 'pendiente' RETURNING *`;
      params = [title ?? null, description ?? null, priority ?? null, metaParam ?? null, id];
    }

    const updateResult = await pool.query(query, params);
    const updatedRequest = updateResult.rows[0];

    // Obtener información del usuario para enviar el correo de actualización
    if (updatedRequest) {
      const userResult = await pool.query('SELECT name, full_name, first_name, last_name, email FROM users WHERE id = $1', [updatedRequest.user_id]);
      if (userResult.rows.length > 0) {
        const u = userResult.rows[0];
        const displayName = u.full_name || (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : null) || u.name;
        u.name = displayName;
        emailService.sendRequestUpdatedNotification(u, updatedRequest);
      }

      // Send email to admins based on category and status
      let notifyAdmin = false;
      let serviceEmailCategory = updatedRequest.category?.toLowerCase() || '';

      if (serviceEmailCategory === 'visitors' && status === 'resuelto') notifyAdmin = true;
      if (serviceEmailCategory === 'parking' && status === 'resuelto') notifyAdmin = true;
      if (serviceEmailCategory === 'maintenance' && status === 'en_progreso') notifyAdmin = true;
      if (serviceEmailCategory === 'transport' && status === 'en_progreso') notifyAdmin = true;

      if (serviceEmailCategory === 'rooms') {
        const isLargeScale = updatedRequest.metadata?.info === 'Especial' || (parseInt(updatedRequest.metadata?.capacity) || 0) >= 100;
        if (isLargeScale && status === 'en_progreso') {
          notifyAdmin = true;
          serviceEmailCategory = 'rooms_special';
        } else if (!isLargeScale && status === 'resuelto') {
          notifyAdmin = true;
        }
      }

      if (notifyAdmin) {
        try {
          const serviceEmailsRes = await pool.query('SELECT email FROM service_emails WHERE service_type = $1', [serviceEmailCategory]);
          for (const row of serviceEmailsRes.rows) {
            emailService.sendAdminServiceNotification(row.email, updatedRequest, status);
          }
        } catch (adminEmailErr) {
          console.error('Error enviando correo a admins:', adminEmailErr);
        }
      }
    }

    res.json(updatedRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la solicitud.' });
  }
});

app.post('/api/requests/:id/comment', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { text, author } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'El comentario es requerido.' });
  }

  try {
    const checkResult = await pool.query('SELECT metadata FROM administrative_requests WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const currentMetadata = checkResult.rows[0].metadata || {};
    const newComment = {
      title: 'Comentario Admin',
      date: new Date().toLocaleString('es-ES'),
      desc: text
    };

    const updatedTimeline = [...(currentMetadata.timeline || []), newComment];
    currentMetadata.timeline = updatedTimeline;

    const updateResult = await pool.query(
      'UPDATE administrative_requests SET metadata = $1::jsonb WHERE id = $2 RETURNING *',
      [JSON.stringify(currentMetadata), id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar el comentario.' });
  }
});

// Actualizar estado de una solicitud (Admin only) evadiendo falsos positivos de WAF
app.post('/api/requests/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden cambiar el estado.' });
  }

  try {
    const checkResult = await pool.query('SELECT metadata FROM administrative_requests WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const currentMetadata = checkResult.rows[0].metadata || {};
    
    const statusDetails = {
      pendiente: { title: 'Solicitud Pendiente', desc: 'Requerimiento restablecido a estado pendiente.' },
      en_progreso: { title: 'Solicitud en Curso', desc: 'Se ha iniciado la atención y procesamiento del requerimiento.' },
      resuelto: { title: 'Solicitud Aprobada', desc: 'La solicitud ha sido resuelta y aprobada con éxito.' },
      rechazado: { title: 'Solicitud Rechazada', desc: 'El requerimiento fue declinado por el administrador.' }
    }[status] || { title: `Estado cambiado a ${status}`, desc: 'El administrador actualizó el estado.' };

    const newStep = {
      title: statusDetails.title,
      date: new Date().toLocaleString('es-ES'),
      desc: statusDetails.desc
    };

    const updatedTimeline = [...(currentMetadata.timeline || []), newStep];
    currentMetadata.timeline = updatedTimeline;

    const updateResult = await pool.query(
      'UPDATE administrative_requests SET status = $1, metadata = $2::jsonb WHERE id = $3 RETURNING *',
      [status, JSON.stringify(currentMetadata), id]
    );

    const updatedRequest = updateResult.rows[0];

    if (updatedRequest) {
      const userResult = await pool.query('SELECT name, full_name, first_name, last_name, email FROM users WHERE id = $1', [updatedRequest.user_id]);
      if (userResult.rows.length > 0) {
        const u = userResult.rows[0];
        const displayName = u.full_name || (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : null) || u.name;
        u.name = displayName;
        emailService.sendRequestUpdatedNotification(u, updatedRequest);
      }
    }

    res.json(updatedRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el estado.' });
  }
});

// Evaluar una solicitud
app.post('/api/requests/:id/evaluate', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5.' });
  }

  try {
    const checkResult = await pool.query('SELECT * FROM administrative_requests WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const request = checkResult.rows[0];

    if (request.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para evaluar esta solicitud.' });
    }

    if (request.status !== 'resuelto') {
      return res.status(400).json({ error: 'Solo se pueden evaluar solicitudes en estado resuelto.' });
    }

    if (request.metadata && request.metadata.evaluation) {
      return res.status(400).json({ error: 'Esta solicitud ya ha sido evaluada.' });
    }

    const metadata = request.metadata || {};
    metadata.evaluation = {
      rating,
      comment: comment || '',
      date: new Date().toISOString()
    };

    const updateResult = await pool.query(
      'UPDATE administrative_requests SET metadata = $1 WHERE id = $2 RETURNING *',
      [metadata, id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la evaluación.' });
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

// --- ENDPOINTS PARA SALAS (ROOMS) ---
app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rooms ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener salas.' });
  }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  const { name, capacity, floor, info } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO rooms (name, capacity, floor, info) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, capacity, floor, info]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear sala.' });
  }
});

app.put('/api/rooms/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, capacity, floor, info } = req.body;
  try {
    const result = await pool.query(
      'UPDATE rooms SET name = COALESCE($1, name), capacity = COALESCE($2, capacity), floor = COALESCE($3, floor), info = COALESCE($4, info) WHERE id = $5 RETURNING *',
      [name, capacity, floor, info, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar sala.' });
  }
});

app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
    res.json({ message: 'Sala eliminada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar sala.' });
  }
});

// --- ENDPOINTS PARA DEPENDENCIAS (DEPENDENCIES) ---
app.get('/api/dependencies', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dependencies ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener dependencias.' });
  }
});

app.post('/api/dependencies', authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO dependencies (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear dependencia.' });
  }
});

app.put('/api/dependencies/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query(
      'UPDATE dependencies SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar dependencia.' });
  }
});

app.delete('/api/dependencies/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM dependencies WHERE id = $1', [id]);
    res.json({ message: 'Dependencia eliminada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar dependencia.' });
  }
});

// --- ENDPOINTS PARA CONDUCTORES (DRIVERS) ---
app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drivers ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener conductores.' });
  }
});

app.post('/api/drivers', authenticateToken, async (req, res) => {
  const { name, phone, is_active } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO drivers (name, phone, is_active) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear conductor.' });
  }
});

app.put('/api/drivers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE drivers SET name = COALESCE($1, name), phone = COALESCE($2, phone), is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING *',
      [name, phone, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar conductor.' });
  }
});

app.delete('/api/drivers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM drivers WHERE id = $1', [id]);
    res.json({ message: 'Conductor eliminado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar conductor.' });
  }
});

// --- ENDPOINTS PARA CORREOS (SERVICE EMAILS) ---
const handleServiceEmailsGet = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM service_emails ORDER BY service_type');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener correos.' });
  }
};
app.get('/api/service-emails', authenticateToken, handleServiceEmailsGet);
app.get('/api/service_emails', authenticateToken, handleServiceEmailsGet);

const handleServiceEmailsPost = async (req, res) => {
  const { service_type, email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO service_emails (service_type, email) VALUES ($1, $2) RETURNING *',
      [service_type, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar correo.' });
  }
};
app.post('/api/service-emails', authenticateToken, handleServiceEmailsPost);
app.post('/api/service_emails', authenticateToken, handleServiceEmailsPost);

const handleServiceEmailsDelete = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM service_emails WHERE id = $1', [id]);
    res.json({ message: 'Correo eliminado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar correo.' });
  }
};
app.delete('/api/service-emails/:id', authenticateToken, handleServiceEmailsDelete);
app.delete('/api/service_emails/:id', authenticateToken, handleServiceEmailsDelete);

// --- ENDPOINTS PARA USUARIOS / PERFILES (PROFILES) ---
const handleProfilesGet = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, first_name, last_name, email, role, username, phone, entity, is_active, dependency_id, start_date, end_date, ldap_enabled, created_at 
      FROM users 
      ORDER BY full_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
};
app.get('/api/users', authenticateToken, handleProfilesGet);
app.get('/api/profiles', authenticateToken, handleProfilesGet);

const handleProfilesPost = async (req, res) => {
  const { id, full_name, first_name, last_name, email, role, username, phone, entity, is_active, dependency_id, start_date, end_date, ldap_enabled } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO users (id, full_name, first_name, last_name, email, role, username, phone, entity, is_active, dependency_id, start_date, end_date, ldap_enabled) 
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
       RETURNING *`,
      [id || null, full_name, first_name, last_name, email, role || 'funcionario', username, phone, entity, is_active !== false, dependency_id, start_date || null, end_date || null, ldap_enabled === true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
};
app.post('/api/users', authenticateToken, handleProfilesPost);
app.post('/api/profiles', authenticateToken, handleProfilesPost);

const handleProfilesPut = async (req, res) => {
  const { id } = req.params;
  const { full_name, first_name, last_name, email, role, username, phone, entity, is_active, dependency_id, start_date, end_date, ldap_enabled } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name), 
           first_name = COALESCE($2, first_name), 
           last_name = COALESCE($3, last_name), 
           email = COALESCE($4, email), 
           role = COALESCE($5, role), 
           username = COALESCE($6, username), 
           phone = COALESCE($7, phone), 
           entity = COALESCE($8, entity), 
           is_active = COALESCE($9, is_active), 
           dependency_id = COALESCE($10, dependency_id), 
           start_date = COALESCE($11, start_date), 
           end_date = COALESCE($12, end_date), 
           ldap_enabled = COALESCE($13, ldap_enabled) 
       WHERE id = $14 RETURNING *`,
      [full_name, first_name, last_name, email, role, username, phone, entity, is_active, dependency_id, start_date, end_date, ldap_enabled, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
};
app.put('/api/users/:id', authenticateToken, handleProfilesPut);
app.put('/api/profiles/:id', authenticateToken, handleProfilesPut);

const handleProfilesDelete = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Usuario eliminado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
};
app.delete('/api/users/:id', authenticateToken, handleProfilesDelete);
app.delete('/api/profiles/:id', authenticateToken, handleProfilesDelete);

// --- ENDPOINTS PARA CHATBOT ---
app.post('/api/chatbot', authenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensaje requerido.' });
  }
  
  const lowerMessage = message.toLowerCase();
  let reply = 'Lo siento, no entiendo tu pregunta. ¿Puedes reformularla?';
  
  if (lowerMessage.includes('contraseña') || lowerMessage.includes('password') || lowerMessage.includes('clave')) {
    reply = 'Para restablecer tu contraseña, contacta al administrador del sistema.';
  } else if (lowerMessage.includes('horario') || lowerMessage.includes('hora')) {
    reply = 'El horario de atención para solicitudes administrativas es de Lunes a Viernes de 8:00 AM a 5:00 PM.';
  } else if (lowerMessage.includes('contacto') || lowerMessage.includes('soporte')) {
    reply = 'Puedes contactar a soporte a través del módulo de "Solicitudes" o enviando un correo al área de TI.';
  } else if (lowerMessage.includes('hola') || lowerMessage.includes('saludos')) {
    reply = '¡Hola! Soy tu asistente virtual. ¿En qué te puedo ayudar hoy?';
  }
  
  // Simular un pequeño retraso para emular procesamiento
  setTimeout(() => {
    res.json({ reply });
  }, 1000);
});

// Inicialización
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor API local corriendo en http://0.0.0.0:${PORT}`);
});

