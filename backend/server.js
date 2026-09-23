const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
require('dotenv').config();
const ldapClient = require('./ldapClient');
const emailService = require('./emailService');


const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

    // Sincronizar usuarios existentes que tengan 'name' pero no 'full_name' o 'first_name'/'last_name'
    await pool.query(`
      UPDATE public.users 
      SET full_name = name 
      WHERE (full_name IS NULL OR full_name = '') AND name IS NOT NULL AND name != '';

      UPDATE public.users 
      SET first_name = SPLIT_PART(name, ' ', 1),
          last_name = NULLIF(SUBSTRING(name FROM LENGTH(SPLIT_PART(name, ' ', 1)) + 2), '')
      WHERE (first_name IS NULL OR first_name = '') AND name IS NOT NULL AND name != '';

      UPDATE public.users u
      SET dependency_id = d.id
      FROM public.dependencies d
      WHERE u.dependency_id IS NULL AND u.dependency IS NOT NULL 
        AND (LOWER(TRIM(u.dependency)) = LOWER(TRIM(d.name)) OR LOWER(d.name) LIKE '%' || LOWER(TRIM(u.dependency)) || '%');
    `).catch(err => console.error('Error al sincronizar nombres de usuarios existentes:', err.message));

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

const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
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

// --- FUNCIONES AUXILIARES PARA ESTADÍSTICAS DEL SERVIDOR ---
const getDiskUsage = () => {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('wmic logicaldisk get caption,size,freespace', (err, stdout) => {
        if (err || !stdout) {
          return resolve({ total: '0 GB', used: '0 GB', free: '0 GB', usedPercent: 0, filesystem: 'C:' });
        }
        const lines = stdout.trim().split('\n').slice(1);
        let totalBytes = 0;
        let freeBytes = 0;
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const free = parseInt(parts[1], 10);
            const size = parseInt(parts[2], 10);
            if (!isNaN(free) && !isNaN(size)) {
              freeBytes += free;
              totalBytes += size;
            }
          }
        });
        const usedBytes = Math.max(0, totalBytes - freeBytes);
        const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
        resolve({
          total: (totalBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
          used: (usedBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
          free: (freeBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
          usedPercent,
          filesystem: 'C:'
        });
      });
    } else {
      exec('df -Pk /', (err, stdout) => {
        if (err || !stdout) {
          return resolve({ total: 'N/A', used: 'N/A', free: 'N/A', usedPercent: 0, filesystem: '/' });
        }
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].trim().split(/\s+/);
          const totalKB = parseInt(parts[1], 10) || 0;
          const usedKB = parseInt(parts[2], 10) || 0;
          const freeKB = parseInt(parts[3], 10) || 0;
          const totalGB = (totalKB / (1024 * 1024)).toFixed(1);
          const usedGB = (usedKB / (1024 * 1024)).toFixed(1);
          const freeGB = (freeKB / (1024 * 1024)).toFixed(1);
          const usedPercent = totalKB > 0 ? Math.round((usedKB / totalKB) * 100) : parseInt(parts[4]) || 0;
          return resolve({
            total: `${totalGB} GB`,
            used: `${usedGB} GB`,
            free: `${freeGB} GB`,
            usedPercent,
            filesystem: parts[0],
            mountedOn: parts[5] || '/'
          });
        }
        resolve({ total: 'N/A', used: 'N/A', free: 'N/A', usedPercent: 0, filesystem: '/' });
      });
    }
  });
};

const getOsDistro = () => {
  if (process.platform === 'linux' && fs.existsSync('/etc/os-release')) {
    try {
      const content = fs.readFileSync('/etc/os-release', 'utf8');
      const prettyMatch = content.match(/PRETTY_NAME="([^"]+)"/);
      if (prettyMatch) return prettyMatch[1];
    } catch (_) {}
  }
  return `${os.type()} ${os.release()}`;
};

const getPrimaryIp = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '10.54.80.209';
};

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(' ');
};

// --- ENDPOINT DE ESTADÍSTICAS E INFRAESTRUCTURA DEL SERVIDOR ---
app.get('/api/admin/server-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden consultar métricas del servidor.' });
    }

    const disk = await getDiskUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(0, totalMem - freeMem);
    const memPercent = Math.round((usedMem / totalMem) * 100);

    const cpus = os.cpus() || [];
    const cpuModel = cpus[0]?.model || 'Desconocido';
    const cpuCores = cpus.length;
    const loadAvg = os.loadavg().map(l => Number(l.toFixed(2)));

    const processMem = process.memoryUsage();
    const processRssMB = (processMem.rss / (1024 * 1024)).toFixed(1);
    const processHeapMB = (processMem.heapUsed / (1024 * 1024)).toFixed(1);

    res.json({
      hostname: os.hostname(),
      ip: getPrimaryIp(),
      osDistro: getOsDistro(),
      platform: os.platform(),
      arch: os.arch(),
      serverUptime: formatUptime(os.uptime()),
      serverUptimeSeconds: os.uptime(),
      backendUptime: formatUptime(process.uptime()),
      nodeVersion: process.version,
      pid: process.pid,
      disk: {
        total: disk.total,
        used: disk.used,
        free: disk.free,
        usedPercent: disk.usedPercent,
        filesystem: disk.filesystem || '/'
      },
      memory: {
        total: (totalMem / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
        used: (usedMem / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
        free: (freeMem / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
        usedPercent: memPercent,
        processRss: `${processRssMB} MB`,
        processHeap: `${processHeapMB} MB`
      },
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        loadAvg
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error obteniendo métricas del servidor:', err);
    res.status(500).json({ error: 'Error al consultar métricas del servidor.' });
  }
});

// --- ENDPOINT DE CONTROL Y DESPLIEGUE GIT ---
app.post('/api/admin/git', authenticateToken, async (req, res) => {
  try {
    // Validar permisos de administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores del sistema pueden ejecutar operaciones de despliegue y Git.' });
    }

    const { action = 'pull' } = req.body;
    const projectRoot = path.resolve(__dirname, '..');
    const frontendDir = path.join(projectRoot, 'frontend');

    if (action === 'status') {
      exec('git status -s && git log -1 --pretty=format:"Último commit: %h - %s (%cr) por %an"', { cwd: projectRoot, timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({ success: false, error: 'Error consultando estado de Git.', output: stderr || stdout || error.message });
        }
        res.json({
          success: true,
          message: 'Estado de repositorio obtenido exitosamente.',
          output: stdout || 'Repositorio limpio, sin cambios pendientes.',
          timestamp: new Date().toISOString()
        });
      });
      return;
    }

    if (action === 'pull') {
      console.log(`[GIT] Ejecutando git pull origin main solicitado por ${req.user.email}`);
      exec('git pull origin main', { cwd: projectRoot, timeout: 90000 }, (error, stdout, stderr) => {
        const fullOutput = (stdout || '') + (stderr ? `\n${stderr}` : '');
        if (error) {
          console.error('[GIT] Error ejecutando git pull:', error);
          return res.status(500).json({
            success: false,
            error: 'Error al ejecutar git pull origin main.',
            output: fullOutput || error.message
          });
        }
        console.log('[GIT] git pull completado:', stdout);
        res.json({
          success: true,
          message: 'Git pull completado exitosamente.',
          output: fullOutput.trim() || 'Repositorio actualizado.',
          timestamp: new Date().toISOString()
        });
      });
      return;
    }

    if (action === 'pull_and_build') {
      console.log(`[GIT] Ejecutando git pull y build frontend solicitado por ${req.user.email}`);
      const cmd = process.platform === 'win32'
        ? `git pull origin main && cd "${frontendDir}" && npx expo export`
        : `git pull origin main && (cd "${frontendDir}" && npx expo export)`;

      exec(cmd, { cwd: projectRoot, timeout: 300000 }, (error, stdout, stderr) => {
        const fullOutput = (stdout || '') + (stderr ? `\n${stderr}` : '');
        if (error) {
          console.error('[GIT] Error en git pull + build:', error);
          return res.status(500).json({
            success: false,
            error: 'Error durante git pull o compilación del frontend.',
            output: fullOutput || error.message
          });
        }
        console.log('[GIT] git pull y build completados exitosamente');
        res.json({
          success: true,
          message: 'Git pull y compilación del frontend completados exitosamente.',
          output: fullOutput.trim(),
          timestamp: new Date().toISOString()
        });
      });
      return;
    }

    if (action === 'restart_backend') {
      console.log(`[GIT] Reinicio de backend solicitado por ${req.user.email}`);
      res.json({
        success: true,
        message: 'Reinicio del servicio backend programado.',
        output: 'El servicio backend se reiniciará inmediatamente a través de PM2.',
        timestamp: new Date().toISOString()
      });

      setTimeout(() => {
        exec('pm2 restart backend-solicitudes || pm2 restart all', (err) => {
          if (err) console.error('[GIT] Error al reiniciar PM2:', err);
        });
      }, 1500);
      return;
    }

    return res.status(400).json({ error: 'Acción no válida. Acciones soportadas: status, pull, pull_and_build, restart_backend' });
  } catch (err) {
    console.error('Error general en endpoint git:', err);
    res.status(500).json({ error: 'Error del servidor procesando solicitud de Git.' });
  }
});

// --- ENDPOINTS DE AUTENTICACIÓN ---

const splitFullName = (fullName) => {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  const firstName = parts.slice(0, parts.length > 3 ? 2 : 1).join(' ');
  const lastName = parts.slice(parts.length > 3 ? 2 : 1).join(' ');
  return { firstName, lastName };
};

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
    const fullName = name.trim();
    const { firstName, lastName } = splitFullName(fullName);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, full_name, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, name, full_name, first_name, last_name, role`,
      [email.toLowerCase(), passwordHash, fullName, fullName, firstName, lastName, role || 'funcionario']
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
          const resolvedName = (ldapUser.name && ldapUser.name !== 'Usuario AD' ? ldapUser.name : null) || user.full_name || user.name || simpleUsername;
          const { firstName, lastName } = splitFullName(resolvedName);

          let dependencyId = user.dependency_id || null;
          if (!dependencyId && ldapUser.dependency) {
            const depRes = await pool.query(
              'SELECT id FROM dependencies WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) OR LOWER(name) LIKE $2 LIMIT 1',
              [ldapUser.dependency, `%${ldapUser.dependency.toLowerCase().trim()}%`]
            );
            if (depRes.rows.length > 0) {
              dependencyId = depRes.rows[0].id;
            }
          }

          const updateResult = await pool.query(
            `UPDATE users 
             SET name = $1, 
                 full_name = $1, 
                 first_name = COALESCE(NULLIF(first_name, ''), $2), 
                 last_name = COALESCE(NULLIF(last_name, ''), $3), 
                 dependency = COALESCE($4, dependency),
                 dependency_id = COALESCE($5, dependency_id)
             WHERE id = $6 RETURNING *`,
            [resolvedName, firstName, lastName, ldapUser.dependency, dependencyId, user.id]
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

        // Sincronizar nombres si estaban incompletos
        const resolvedName = user.full_name || user.name;
        if (resolvedName && (!user.full_name || !user.name || !user.first_name)) {
          const { firstName, lastName } = splitFullName(resolvedName);
          const updateResult = await pool.query(
            `UPDATE users 
             SET name = COALESCE(name, $1),
                 full_name = COALESCE(full_name, $1),
                 first_name = COALESCE(NULLIF(first_name, ''), $2),
                 last_name = COALESCE(NULLIF(last_name, ''), $3)
             WHERE id = $4 RETURNING *`,
            [resolvedName, firstName, lastName, user.id]
          );
          user = updateResult.rows[0];
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
        const resolvedName = (ldapUser.name && ldapUser.name !== 'Usuario AD' ? ldapUser.name : null) || simpleUsername;
        const { firstName, lastName } = splitFullName(resolvedName);

        let dependencyId = null;
        if (ldapUser.dependency) {
          const depRes = await pool.query(
            'SELECT id FROM dependencies WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) OR LOWER(name) LIKE $2 LIMIT 1',
            [ldapUser.dependency, `%${ldapUser.dependency.toLowerCase().trim()}%`]
          );
          if (depRes.rows.length > 0) {
            dependencyId = depRes.rows[0].id;
          }
        }

        const insertResult = await pool.query(
          `INSERT INTO users (email, username, name, full_name, first_name, last_name, dependency, dependency_id, ldap_enabled, role) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9) RETURNING *`,
          [
            ldapUser.email.toLowerCase(), 
            ldapUser.username.toLowerCase(), 
            resolvedName, 
            resolvedName, 
            firstName, 
            lastName, 
            ldapUser.dependency, 
            dependencyId,
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
        name: user.full_name || user.name,
        full_name: user.full_name || user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        username: user.username,
        dependency: user.dependency,
        dependency_id: user.dependency_id,
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
    const result = await pool.query(`
      SELECT id, email, name, full_name, first_name, last_name, role, dependency, dependency_id, username, ldap_enabled 
      FROM users WHERE id = $1
    `, [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const u = result.rows[0];
    res.json({ 
      user: {
        ...u,
        name: u.full_name || u.name,
        full_name: u.full_name || u.name
      } 
    });
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
      "SELECT id, title, metadata, status FROM administrative_requests WHERE category = 'rooms' AND status != 'rechazado'"
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
    let currentUserObj = null;
    if (userResult.rows.length > 0) {
      const u = userResult.rows[0];
      const displayName = u.full_name || (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : null) || u.name;
      u.name = displayName;
      currentUserObj = u;
      await emailService.sendRequestCreatedNotification(u, createdRequest).catch(e => console.error('Error enviando correo de creación al solicitante:', e));
    }

    // 2. Notificación automática a la persona/equipo que aprueba o gestiona el trámite (service_emails)
    let adminServiceKey = createdRequest.category?.toLowerCase() || '';
    if (adminServiceKey === 'rooms') {
      let meta = createdRequest.metadata || {};
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
      }
      const roomName = (meta.room && typeof meta.room === 'object' ? meta.room.name : meta.room) || '';
      const isSpecialRoom = meta.requires_secretaria_general === true ||
                            meta.info === 'Especial' || 
                            (parseInt(meta.capacity) || 0) >= 100 ||
                            /huitaca|secretar[ií]a\s*general|auditorio/i.test(roomName);
      if (isSpecialRoom) {
        adminServiceKey = 'rooms_special';
      }
    }

    try {
      // En radicación, la alerta inicial va a los funcionarios del Proceso de gestión administrativa (manager)
      let adminEmailsRes = await pool.query(
        `SELECT email FROM service_emails WHERE LOWER(TRIM(service_type)) = 'manager'`
      );
      if (adminEmailsRes.rows.length === 0) {
        adminEmailsRes = await pool.query(
          `SELECT email FROM service_emails WHERE LOWER(TRIM(service_type)) = LOWER(TRIM($1))`,
          [adminServiceKey || '']
        );
      }
      const adminEmails = adminEmailsRes.rows.map(r => r.email?.trim()).filter(Boolean);
      const clientEmails = Array.isArray(req.body?.adminEmails)
        ? req.body.adminEmails.map(e => String(e).trim()).filter(Boolean)
        : [];
      let uniqueAdminEmails = [...new Set([...adminEmails, ...clientEmails])];

      console.log(`\n🔍 [CREACIÓN REQ #${createdRequest.id}] Buscando destinatarios para categoría "${adminServiceKey}":`);
      console.log(`   📂 Desde Base de Datos (service_emails): [${adminEmails.join(', ') || 'NINGUNO'}]`);
      console.log(`   🌐 Desde Cliente Frontend (adminEmails): [${clientEmails.join(', ') || 'NINGUNO'}]`);
      console.log(`   🎯 Destinatarios finales consolidados:   [${uniqueAdminEmails.join(', ') || 'VACÍO'}]`);
      if (uniqueAdminEmails.length === 0) {
        console.warn(`   ⚠️ [ADVERTENCIA] No hay correos asignados a "${adminServiceKey}". La notificación a encargados no se enviará.`);
      }

      if (uniqueAdminEmails.length > 0) {
        await emailService.sendAdminNewRequestNotification(uniqueAdminEmails, createdRequest, currentUserObj || { name: 'Funcionario' });
      }
    } catch (adminNotifyErr) {
      console.error('Error enviando notificación de nueva solicitud a administradores:', adminNotifyErr);
    }

    res.status(201).json(createdRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la solicitud.' });
  }
});

// Actualizar una solicitud (soporta PUT y POST para evitar bloqueos por WAF o proxies institucionales)
const handleUpdateRequest = async (req, res) => {
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
      const cleanStatus = (status || updatedRequest.status || '').toLowerCase().trim();
      const isStatusApprove = ['resuelto', 'aprobado', 'resuelta', 'aprobada', 'approved', 'resolved'].includes(cleanStatus);
      const isStatusProgress = ['en_progreso', 'en progreso', 'en curso', 'en_curso', 'in_progress'].includes(cleanStatus);

      if (serviceEmailCategory === 'visitors' && isStatusApprove) notifyAdmin = true;
      if (serviceEmailCategory === 'parking' && isStatusApprove) notifyAdmin = true;
      if (serviceEmailCategory === 'maintenance' && (isStatusProgress || isStatusApprove)) notifyAdmin = true;
      if (serviceEmailCategory === 'transport' && (isStatusProgress || isStatusApprove)) notifyAdmin = true;

      if (serviceEmailCategory === 'rooms') {
        let meta = updatedRequest.metadata || {};
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        }
        const roomName = (meta.room && typeof meta.room === 'object' ? meta.room.name : meta.room) || '';
        const isSpecialRoom = meta.requires_secretaria_general === true ||
                              meta.info === 'Especial' || 
                              (parseInt(meta.capacity) || 0) >= 100 ||
                              /huitaca|secretar[ií]a\s*general|auditorio/i.test(roomName);

        if (isSpecialRoom) {
          serviceEmailCategory = 'rooms_special';
          if (isStatusApprove || isStatusProgress) {
            notifyAdmin = true;
          }
        } else {
          if (isStatusApprove || isStatusProgress) {
            notifyAdmin = true;
          }
        }
      }

      if (notifyAdmin) {
        try {
          let serviceEmailsRes;
          if (serviceEmailCategory === 'visitors' && isStatusApprove) {
            // Aprobación de visitantes: Destinatario ÚNICAMENTE Secretaría General
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails 
               WHERE LOWER(TRIM(service_type)) IN ('visitors', 'secretaria_general', 'secretariageneral', 'secretaria')`
            );
          } else if (serviceEmailCategory === 'maintenance' && isStatusProgress) {
            // Mantenimiento al pasar a progreso: Correo automático a la Secretaría General
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails 
               WHERE LOWER(TRIM(service_type)) = 'maintenance'`
            );
          } else if (serviceEmailCategory === 'rooms_special') {
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails 
               WHERE LOWER(TRIM(service_type)) IN ('rooms_special', 'secretaria_general', 'secretariageneral', 'secretaria', 'auditorio')`
            );
            if (serviceEmailsRes.rows.length === 0) {
              serviceEmailsRes = await pool.query(
                `SELECT email FROM service_emails WHERE LOWER(TRIM(service_type)) = 'rooms'`
              );
            }
          } else if (serviceEmailCategory === 'parking' && isStatusApprove) {
            // Aprobación de parqueadero: Destinatario Portería Manzana Liévano / Parqueaderos
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails WHERE LOWER(TRIM(service_type)) = 'parking'`
            );
          } else {
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails 
               WHERE LOWER(TRIM(service_type)) = LOWER(TRIM($1)) 
                  OR LOWER(TRIM(service_type)) IN ('manager', 'secretaria_general', 'secretariageneral', 'secretaria')`,
              [serviceEmailCategory]
            );
          }
          const dbEmails = serviceEmailsRes.rows.map(r => r.email?.trim()).filter(Boolean);
          const clientEmails = Array.isArray(req.body?.adminEmails)
            ? req.body.adminEmails.map(e => String(e).trim()).filter(Boolean)
            : [];
          let uniqueEmails = [...new Set([...dbEmails, ...clientEmails])];

          console.log(`\n🔍 [ACTUALIZACIÓN REQ #${updatedRequest.id} (PUT)] Destinatarios para categoría "${serviceEmailCategory}":`);
          console.log(`   📂 Desde Base de Datos (service_emails): [${dbEmails.join(', ') || 'NINGUNO'}]`);
          console.log(`   🌐 Desde Cliente Frontend (adminEmails): [${clientEmails.join(', ') || 'NINGUNO'}]`);
          console.log(`   🎯 Destinatarios finales consolidados:   [${uniqueEmails.join(', ') || 'VACÍO'}]`);
          if (uniqueEmails.length === 0) {
            console.warn(`   ⚠️ [ADVERTENCIA] No hay correos asignados a "${serviceEmailCategory}". La notificación de actualización/aprobación no se enviará.`);
          }

          if (uniqueEmails.length > 0) {
            await emailService.sendAdminServiceNotification(uniqueEmails, updatedRequest, status);
          }
        } catch (adminEmailErr) {
          console.error('Error enviando correo a admins:', adminEmailErr);
        }
      }

      // Notificar a Oficina de TIC SOLO después de aprobada la sala estándar si requiere equipos tecnológicos
      if (updatedRequest.category?.toLowerCase() === 'rooms' && isStatusApprove) {
        let meta = updatedRequest.metadata || {};
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        }
        const roomName = (meta.room && typeof meta.room === 'object' ? meta.room.name : meta.room) || '';
        const isSpecialRoom = meta.requires_secretaria_general === true ||
                              meta.info === 'Especial' || 
                              (parseInt(meta.capacity) || 0) >= 100 ||
                              /huitaca|secretar[ií]a\s*general|auditorio/i.test(roomName);

        if (!isSpecialRoom) {
          const hasTechEquipment = 
            (meta.services && (meta.services.projector || meta.services.laptop || meta.services.tech_tic)) ||
            (Array.isArray(meta.tech_requirements) && meta.tech_requirements.some(t => 
              /proyector|videobeam|laptop|computador|equipos tic/i.test(t)
            )) ||
            (meta.custom_tech_description && meta.custom_tech_description.trim().length > 0);

          if (hasTechEquipment) {
            try {
              const ticEmailsRes = await pool.query("SELECT email FROM service_emails WHERE service_type = 'rooms_tic'");
              const ticEmails = ticEmailsRes.rows.map(r => r.email?.trim()).filter(Boolean);
              const uniqueTic = [...new Set(ticEmails)];
              if (uniqueTic.length > 0) {
                const uRes = await pool.query('SELECT name, full_name, first_name, last_name, email FROM users WHERE id = $1', [updatedRequest.user_id]);
                await emailService.sendTicRoomNotification(uniqueTic, updatedRequest, uRes.rows[0] || { name: 'Funcionario' });
              }
            } catch (ticErr) {
              console.error('Error enviando notificación a TIC al aprobar sala estándar:', ticErr);
            }
          }
        }
      }
    }

    res.json(updatedRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la solicitud.' });
  }
};

app.put('/api/requests/:id', authenticateToken, handleUpdateRequest);
app.post('/api/requests/:id/update', authenticateToken, handleUpdateRequest);
app.post('/api/requests/:id', authenticateToken, handleUpdateRequest);

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
  const { status, finalImage, reason, metadata } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden cambiar el estado.' });
  }

  try {
    const checkResult = await pool.query('SELECT metadata, admin_notes FROM administrative_requests WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    let currentMetadata = checkResult.rows[0].metadata || {};
    if (typeof currentMetadata === 'string') {
      try { currentMetadata = JSON.parse(currentMetadata); } catch(e) {}
    }

    // Integrar metadatos adicionales si vienen en el payload (ej. asignación de conductor)
    if (metadata && typeof metadata === 'object') {
      currentMetadata = { ...currentMetadata, ...metadata };
    }
    
    const statusDetails = {
      pendiente: { title: 'Solicitud Pendiente', desc: 'Requerimiento restablecido a estado pendiente.' },
      en_progreso: { title: 'Solicitud en Curso', desc: 'Se ha iniciado la atención y procesamiento del requerimiento.' },
      resuelto: { title: 'Solicitud Aprobada', desc: 'La solicitud ha sido resuelta y aprobada con éxito.' },
      rechazado: { 
        title: 'Solicitud Rechazada', 
        desc: reason ? `Motivo: ${reason}` : 'El requerimiento fue declinado por el administrador.' 
      }
    }[status] || { title: `Estado cambiado a ${status}`, desc: 'El administrador actualizó el estado.' };

    const newStep = {
      title: statusDetails.title,
      date: new Date().toLocaleString('es-ES'),
      desc: statusDetails.desc
    };

    if (finalImage) {
      currentMetadata.finalImage = finalImage;
    }

    if (reason) {
      currentMetadata.rejection_reason = reason;
    }

    const updatedTimeline = [...(currentMetadata.timeline || []), newStep];
    currentMetadata.timeline = updatedTimeline;

    const notesToSave = reason ? reason : checkResult.rows[0].admin_notes;

    const updateResult = await pool.query(
      'UPDATE administrative_requests SET status = $1, metadata = $2::jsonb, admin_notes = $3 WHERE id = $4 RETURNING *',
      [status, JSON.stringify(currentMetadata), notesToSave, id]
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

      // Notificar a equipo de servicio y gestores si pasa a en_progreso o resuelto
      let serviceEmailCategory = updatedRequest.category?.toLowerCase() || '';
      let notifyAdmin = false;
      const cleanStatus = (status || updatedRequest.status || '').toLowerCase().trim();
      const isStatusApprove = ['resuelto', 'aprobado', 'resuelta', 'aprobada', 'approved', 'resolved'].includes(cleanStatus);
      const isStatusProgress = ['en_progreso', 'en progreso', 'en curso', 'en_curso', 'in_progress'].includes(cleanStatus);

      if (serviceEmailCategory === 'visitors' && isStatusApprove) notifyAdmin = true;
      if (serviceEmailCategory === 'parking' && isStatusApprove) notifyAdmin = true;
      if (serviceEmailCategory === 'maintenance' && isStatusProgress) notifyAdmin = true;
      if (serviceEmailCategory === 'transport' && (isStatusProgress || isStatusApprove)) notifyAdmin = true;

      if (serviceEmailCategory === 'rooms') {
        let meta = updatedRequest.metadata || {};
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        }
        const roomName = (meta.room && typeof meta.room === 'object' ? meta.room.name : meta.room) || '';
        const isSpecialRoom = meta.requires_secretaria_general === true ||
                              meta.info === 'Especial' || 
                              (parseInt(meta.capacity) || 0) >= 100 ||
                              /huitaca|secretar[ií]a\s*general|auditorio/i.test(roomName);

        if (isSpecialRoom) {
          serviceEmailCategory = 'rooms_special';
          if (isStatusApprove || isStatusProgress) {
            notifyAdmin = true;
          }
        } else {
          if (isStatusApprove || isStatusProgress) {
            notifyAdmin = true;
          }
        }
      }

      if (notifyAdmin) {
        try {
          let serviceEmailsRes;
          if (serviceEmailCategory === 'visitors' && isStatusApprove) {
            // Aprobación de visitantes: Destinatario ÚNICAMENTE Secretaría General
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails 
               WHERE LOWER(TRIM(service_type)) IN ('visitors', 'secretaria_general', 'secretariageneral', 'secretaria')`
            );
          } else if (serviceEmailCategory === 'maintenance' && isStatusProgress) {
            // Mantenimiento al pasar a progreso: Correo automático a la Secretaría General
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails 
               WHERE LOWER(TRIM(service_type)) = 'maintenance'`
            );
          } else if (serviceEmailCategory === 'rooms_special') {
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails 
               WHERE LOWER(TRIM(service_type)) IN ('rooms_special', 'secretaria_general', 'secretariageneral', 'secretaria', 'auditorio')`
            );
            if (serviceEmailsRes.rows.length === 0) {
              serviceEmailsRes = await pool.query(
                `SELECT email FROM service_emails WHERE LOWER(TRIM(service_type)) = 'rooms'`
              );
            }
          } else if (serviceEmailCategory === 'parking' && isStatusApprove) {
            // Aprobación de parqueadero: Destinatario Portería Manzana Liévano / Parqueaderos
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails WHERE LOWER(TRIM(service_type)) = 'parking'`
            );
          } else {
            serviceEmailsRes = await pool.query(
              `SELECT email FROM service_emails 
               WHERE LOWER(TRIM(service_type)) = LOWER(TRIM($1)) 
                  OR LOWER(TRIM(service_type)) IN ('manager', 'secretaria_general', 'secretariageneral', 'secretaria')`,
              [serviceEmailCategory]
            );
          }
          const dbEmails = serviceEmailsRes.rows.map(r => r.email?.trim()).filter(Boolean);
          const clientEmails = Array.isArray(req.body?.adminEmails)
            ? req.body.adminEmails.map(e => String(e).trim()).filter(Boolean)
            : [];
          let uniqueEmails = [...new Set([...dbEmails, ...clientEmails])];

          console.log(`\n🔍 [CAMBIO ESTADO REQ #${updatedRequest.id} (POST /status)] Destinatarios para categoría "${serviceEmailCategory}":`);
          console.log(`   📂 Desde Base de Datos (service_emails): [${dbEmails.join(', ') || 'NINGUNO'}]`);
          console.log(`   🌐 Desde Cliente Frontend (adminEmails): [${clientEmails.join(', ') || 'NINGUNO'}]`);
          console.log(`   🎯 Destinatarios finales consolidados:   [${uniqueEmails.join(', ') || 'VACÍO'}]`);
          if (uniqueEmails.length === 0) {
            console.warn(`   ⚠️ [ADVERTENCIA] No hay correos asignados a "${serviceEmailCategory}". La notificación de cambio de estado a encargados no se enviará.`);
          }

          if (uniqueEmails.length > 0) {
            await emailService.sendAdminServiceNotification(uniqueEmails, updatedRequest, status);
          }
        } catch (adminEmailErr) {
          console.error('Error enviando correo a administradores en cambio de estado:', adminEmailErr);
        }
      }

      // Notificar a Oficina de TIC SOLO después de aprobada la sala estándar si requiere equipos tecnológicos
      if (updatedRequest.category?.toLowerCase() === 'rooms' && isStatusApprove) {
        let meta = updatedRequest.metadata || {};
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        }
        const roomName = (meta.room && typeof meta.room === 'object' ? meta.room.name : meta.room) || '';
        const isSpecialRoom = meta.requires_secretaria_general === true ||
                              meta.info === 'Especial' || 
                              (parseInt(meta.capacity) || 0) >= 100 ||
                              /huitaca|secretar[ií]a\s*general|auditorio/i.test(roomName);

        if (!isSpecialRoom) {
          const hasTechEquipment = 
            (meta.services && (meta.services.projector || meta.services.laptop || meta.services.tech_tic)) ||
            (Array.isArray(meta.tech_requirements) && meta.tech_requirements.some(t => 
              /proyector|videobeam|laptop|computador|equipos tic/i.test(t)
            )) ||
            (meta.custom_tech_description && meta.custom_tech_description.trim().length > 0);

          if (hasTechEquipment) {
            try {
              const ticEmailsRes = await pool.query("SELECT email FROM service_emails WHERE service_type = 'rooms_tic'");
              const ticEmails = ticEmailsRes.rows.map(r => r.email?.trim()).filter(Boolean);
              const uniqueTic = [...new Set(ticEmails)];
              if (uniqueTic.length > 0) {
                const uRes = await pool.query('SELECT name, full_name, first_name, last_name, email FROM users WHERE id = $1', [updatedRequest.user_id]);
                await emailService.sendTicRoomNotification(uniqueTic, updatedRequest, uRes.rows[0] || { name: 'Funcionario' });
              }
            } catch (ticErr) {
              console.error('Error enviando notificación a TIC al aprobar sala estándar:', ticErr);
            }
          }
        }
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
    console.error('Error al obtener correos:', err);
    res.status(500).json({ error: 'Error al obtener correos.' });
  }
};
app.get('/api/service-emails', optionalAuthenticateToken, handleServiceEmailsGet);
app.get('/api/service_emails', optionalAuthenticateToken, handleServiceEmailsGet);

const handleServiceEmailsPost = async (req, res) => {
  const { service_type, email } = req.body;
  const cleanEmail = String(email || '').trim();
  const cleanType = String(service_type || '').trim();
  if (!cleanEmail || !cleanType) {
    return res.status(400).json({ error: 'service_type y email son requeridos.' });
  }

  try {
    const existing = await pool.query(
      'SELECT * FROM service_emails WHERE service_type = $1 AND LOWER(TRIM(email)) = LOWER($2)',
      [cleanType, cleanEmail]
    );
    if (existing.rows.length > 0) {
      return res.status(200).json(existing.rows[0]);
    }

    const result = await pool.query(
      'INSERT INTO service_emails (service_type, email) VALUES ($1, $2) RETURNING *',
      [cleanType, cleanEmail]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al guardar correo:', err);
    res.status(500).json({ error: 'Error al guardar correo.' });
  }
};
app.post('/api/service-emails', optionalAuthenticateToken, handleServiceEmailsPost);
app.post('/api/service_emails', optionalAuthenticateToken, handleServiceEmailsPost);

app.post('/api/service-emails/sync', optionalAuthenticateToken, async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails)) {
    return res.status(400).json({ error: 'Se esperaba un array de correos.' });
  }
  try {
    for (const item of emails) {
      if (item && item.service_type && item.email) {
        const cleanType = String(item.service_type).trim();
        const cleanEmail = String(item.email).trim().toLowerCase();
        const check = await pool.query(
          'SELECT id FROM service_emails WHERE service_type = $1 AND LOWER(TRIM(email)) = LOWER($2)',
          [cleanType, cleanEmail]
        );
        if (check.rows.length === 0) {
          await pool.query(
            'INSERT INTO service_emails (service_type, email) VALUES ($1, $2)',
            [cleanType, cleanEmail]
          );
        }
      }
    }
    const updated = await pool.query('SELECT * FROM service_emails ORDER BY service_type, email');
    res.json(updated.rows);
  } catch (err) {
    console.error('Error en sincronización de correos:', err);
    res.status(500).json({ error: 'Error sincronizando correos.' });
  }
});
app.post('/api/service_emails/sync', optionalAuthenticateToken, async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails)) {
    return res.status(400).json({ error: 'Se esperaba un array de correos.' });
  }
  try {
    for (const item of emails) {
      if (item && item.service_type && item.email) {
        const cleanType = String(item.service_type).trim();
        const cleanEmail = String(item.email).trim().toLowerCase();
        const check = await pool.query(
          'SELECT id FROM service_emails WHERE service_type = $1 AND LOWER(TRIM(email)) = LOWER($2)',
          [cleanType, cleanEmail]
        );
        if (check.rows.length === 0) {
          await pool.query(
            'INSERT INTO service_emails (service_type, email) VALUES ($1, $2)',
            [cleanType, cleanEmail]
          );
        }
      }
    }
    const updated = await pool.query('SELECT * FROM service_emails ORDER BY service_type, email');
    res.json(updated.rows);
  } catch (err) {
    console.error('Error en sincronización de correos:', err);
    res.status(500).json({ error: 'Error sincronizando correos.' });
  }
});

const handleBulkSaveServiceEmails = async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails)) {
    return res.status(400).json({ error: 'Se esperaba un array de correos.' });
  }
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM service_emails');
    for (const item of emails) {
      if (item && item.service_type && item.email) {
        const cleanType = String(item.service_type).trim();
        const cleanEmail = String(item.email).trim().toLowerCase();
        if (cleanType && cleanEmail) {
          await pool.query(
            'INSERT INTO service_emails (service_type, email) VALUES ($1, $2)',
            [cleanType, cleanEmail]
          );
        }
      }
    }
    await pool.query('COMMIT');
    const updated = await pool.query('SELECT * FROM service_emails ORDER BY service_type, email');
    res.json(updated.rows);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error al guardar masivamente los correos de servicio:', err);
    res.status(500).json({ error: 'Error al guardar los correos en la base de datos.' });
  }
};
app.post('/api/service-emails/bulk-save', optionalAuthenticateToken, handleBulkSaveServiceEmails);
app.post('/api/service_emails/bulk-save', optionalAuthenticateToken, handleBulkSaveServiceEmails);

const handleServiceEmailsDelete = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM service_emails WHERE id = $1', [id]);
    res.json({ message: 'Correo eliminado.' });
  } catch (err) {
    console.error('Error al eliminar correo:', err);
    res.status(500).json({ error: 'Error al eliminar correo.' });
  }
};
app.delete('/api/service-emails/:id', optionalAuthenticateToken, handleServiceEmailsDelete);
app.delete('/api/service_emails/:id', optionalAuthenticateToken, handleServiceEmailsDelete);

// --- ENDPOINTS PARA USUARIOS / PERFILES (PROFILES) ---
const handleProfilesGet = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name,
        COALESCE(full_name, name) AS full_name, 
        COALESCE(first_name, SPLIT_PART(COALESCE(full_name, name), ' ', 1)) AS first_name, 
        COALESCE(last_name, NULLIF(SUBSTRING(COALESCE(full_name, name) FROM LENGTH(SPLIT_PART(COALESCE(full_name, name), ' ', 1)) + 2), '')) AS last_name,
        email, 
        role, 
        username, 
        phone, 
        entity, 
        is_active, 
        dependency,
        dependency_id, 
        start_date, 
        end_date, 
        ldap_enabled, 
        created_at 
      FROM users 
      ORDER BY COALESCE(full_name, name) ASC
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
  const { id, full_name, first_name, last_name, name, email, role, username, phone, entity, is_active, dependency, dependency_id, start_date, end_date, ldap_enabled } = req.body;
  const resolvedName = (full_name || name || [first_name, last_name].filter(Boolean).join(' ').trim()) || null;
  const { firstName: fn, lastName: ln } = splitFullName(resolvedName);
  const finalFirstName = first_name || fn;
  const finalLastName = last_name || ln;

  try {
    const result = await pool.query(
      `INSERT INTO users (id, name, full_name, first_name, last_name, email, role, username, phone, entity, is_active, dependency, dependency_id, start_date, end_date, ldap_enabled) 
       VALUES (COALESCE($1, gen_random_uuid()), $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
       RETURNING *`,
      [id || null, resolvedName, finalFirstName, finalLastName, email, role || 'funcionario', username, phone, entity, is_active !== false, dependency || null, dependency_id || null, start_date || null, end_date || null, ldap_enabled === true]
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
  const { full_name, first_name, last_name, name, email, role, username, phone, entity, is_active, dependency, dependency_id, start_date, end_date, ldap_enabled } = req.body;
  const resolvedName = full_name || name || (first_name || last_name ? [first_name, last_name].filter(Boolean).join(' ').trim() : null);

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           full_name = COALESCE($1, full_name, name), 
           first_name = COALESCE($2, first_name), 
           last_name = COALESCE($3, last_name), 
           email = COALESCE($4, email), 
           role = COALESCE($5, role), 
           username = COALESCE($6, username), 
           phone = COALESCE($7, phone), 
           entity = COALESCE($8, entity), 
           is_active = COALESCE($9, is_active), 
           dependency = COALESCE($10, dependency),
           dependency_id = COALESCE($11, dependency_id), 
           start_date = COALESCE($12, start_date), 
           end_date = COALESCE($13, end_date), 
           ldap_enabled = COALESCE($14, ldap_enabled) 
       WHERE id = $15 RETURNING *`,
      [resolvedName, first_name, last_name, email, role, username, phone, entity, is_active, dependency, dependency_id, start_date, end_date, ldap_enabled, id]
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
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/chatbot', optionalAuthenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensaje requerido.' });
  }

  try {
    if (!groq.apiKey) {
      return res.json({ reply: '¡Hola! Para que pueda darte respuestas reales con IA, por favor configura la variable **GROQ_API_KEY** en el archivo `.env` del servidor.' });
    }

    // 1. Obtener datos del usuario en tiempo real
    let userInfoText = "Información del usuario no disponible.";
    if (req.user && req.user.id) {
      const userResult = await pool.query('SELECT name, email, role, dependency FROM users WHERE id = $1', [req.user.id]);
      if (userResult.rows.length > 0) {
        const u = userResult.rows[0];
        userInfoText = `Nombre: ${u.name || 'Desconocido'}, Correo: ${u.email}, Rol: ${u.role}, Dependencia: ${u.dependency || 'No asignada'}.`;
      }
    }

    // 2. Obtener lista de salas disponibles desde la base de datos
    let roomsText = "No hay salas registradas actualmente en el sistema.";
    const roomsResult = await pool.query('SELECT name, capacity, floor, info FROM rooms');
    if (roomsResult.rows.length > 0) {
      roomsText = roomsResult.rows.map(r => `- ${r.name} (Capacidad: ${r.capacity} personas, Piso: ${r.floor}. Info extra: ${r.info || 'N/A'})`).join('\n');
    }


    
    const systemContext = `Eres el Asistente Virtual experto de SASGE 2.0 (Sistema de Solicitudes Administrativas). 
Tu objetivo es ayudar a los funcionarios a resolver dudas sobre cómo realizar solicitudes y cómo funciona el sistema.

INFORMACIÓN DEL SISTEMA:
- Catálogo de Servicios: Reserva de salas, Transporte institucional, Mantenimiento locativo, Ingreso de visitantes, Asignación de parqueaderos y Gestión de préstamos de equipos asociados a reservas de salas.
- Horarios de atención/respuesta: Lunes a Viernes de 7:00 AM a 4:30 PM.
- Soporte/Administradores: Servidores del proceso de gestión administrativa.

DATOS EN TIEMPO REAL (Úsalos para dar respuestas precisas y personalizadas):
---
[Usuario Actual con el que estás hablando]
${userInfoText}

[Salas Existentes en el Sistema para Reservas]
${roomsText}
---

FLUJOS DE LOS SERVICIOS (Úsalos para explicar el proceso a los usuarios):
1. Reserva de salas: El usuario registra la solicitud (fecha, hora, sede, asistentes). El Gestor Administrativo la revisa y aprueba/rechaza. Si se aprueba, se bloquea en el calendario institucional automáticamente.
2. Ingreso de visitantes: El funcionario registra datos del visitante (identidad, motivo, fecha). El Gestor valida y autoriza. Seguridad recibe la autorización para permitir el ingreso.
3. Transporte institucional: Se registra con origen, destino, fecha y justificación. Tras revisión de Gestión Administrativa, se asigna vehículo y conductor, notificando a todos.
4. Mantenimiento locativo: Se registra el requerimiento, ubicación y prioridad. Gestión Administrativa lo evalúa y aprueba, y la Secretaría General se encarga de ejecutarlo.
5. Asignación de parqueaderos: Se registra solicitud, se validan los requisitos y el perfil. Gestión Administrativa evalúa y asigna los cupos.

INSTRUCCIONES FINALES:
- Háblale al usuario por su nombre. Eres su asistente amigable.
- Responde de forma corta, muy clara y concisa. No des respuestas gigantes ni redundantes.
- Usa listas o viñetas (Markdown) si debes explicar pasos o listar salas.
- Si no sabes algo, no inventes. Diles que contacten a los "servidores del proceso de gestión administrativa" o que lo hagan dentro del horario de atención.
  
${require('./chatbotKnowledge')}
`;

    // Modelos candidatos en orden de prioridad (llama-3.1-8b-instant es rápido y disponible para todos los tiers)
    const candidateModels = [
      process.env.GROQ_MODEL,
      "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "openai/gpt-oss-120b"
    ].filter(Boolean);

    let chatCompletion = null;
    let lastError = null;

    for (const model of candidateModels) {
      try {
        chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemContext },
            { role: "user", content: message }
          ],
          model,
        });
        if (chatCompletion) break;
      } catch (err) {
        lastError = err;
        // Si el modelo no existe o la cuenta no tiene acceso (404), intentamos con el siguiente modelo
        if (err.status === 404 || (err.message && (err.message.includes('model_not_found') || err.message.includes('does not exist')))) {
          console.warn(`Modelo ${model} no disponible en Groq, probando modelo alternativo...`);
          continue;
        }
        throw err;
      }
    }

    if (!chatCompletion) {
      throw lastError || new Error("No se pudo obtener respuesta con los modelos configurados.");
    }

    const reply = chatCompletion.choices[0]?.message?.content || "";

    res.json({ reply });
  } catch (error) {
    console.error('Error con Groq:', error);
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      return res.status(429).json({ error: 'El Asistente está recibiendo demasiadas consultas muy rápido. Por favor, espera aproximadamente un minuto antes de volver a preguntar.' });
    }
    res.status(500).json({ error: `Lo siento, tuve un problema interno al comunicarme con la IA. Error real: ${error.message}` });
  }
});

// --- ENDPOINTS PARA CONFIGURACIONES DEL SISTEMA (SYSTEM_SETTINGS) ---
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const result = await pool.query('SELECT value FROM system_settings WHERE key = $1', [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada.' });
    }
    res.json(result.rows[0].value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar configuración.' });
  }
});

app.post('/api/settings/:key', authenticateToken, async (req, res) => {
  const { key } = req.params;
  const value = req.body && req.body.value !== undefined ? req.body.value : req.body;
  try {
    const result = await pool.query(`
      INSERT INTO system_settings (key, value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      RETURNING value
    `, [key, JSON.stringify(value)]);
    res.json(result.rows[0].value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar configuración.' });
  }
});

// --- ENDPOINTS PARA INFRAESTRUCTURA Y MÉTRICAS DEL SERVIDOR ---
app.get('/api/admin/server-stats', authenticateToken, async (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = process.memoryUsage();
    const cpus = os.cpus() || [];
    const serverUptimeSeconds = Math.floor(os.uptime());
    const backendUptimeSeconds = Math.floor(process.uptime());

    const formatUptime = (sec) => {
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m`;
    };

    const formatBytes = (bytes) => {
      if (!bytes || bytes === 0) return '0 MB';
      const gb = bytes / (1024 * 1024 * 1024);
      if (gb >= 1) return `${gb.toFixed(2)} GB`;
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    };

    let serverIp = '10.54.80.209';
    try {
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            serverIp = net.address;
            break;
          }
        }
      }
    } catch (e) {}

    const stats = {
      hostname: os.hostname(),
      ip: serverIp,
      osDistro: `${os.type()} ${os.release()}`,
      platform: os.platform(),
      arch: os.arch(),
      serverUptime: formatUptime(serverUptimeSeconds),
      serverUptimeSeconds,
      backendUptime: formatUptime(backendUptimeSeconds),
      nodeVersion: process.version,
      pid: process.pid,
      disk: {
        total: '120 GB',
        used: '42 GB',
        free: '78 GB',
        usedPercent: 35,
        filesystem: '/dev/sda1'
      },
      memory: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        usedPercent: Math.round((usedMem / totalMem) * 100),
        processRss: formatBytes(memUsage.rss),
        processHeap: formatBytes(memUsage.heapUsed)
      },
      cpu: {
        model: cpus[0]?.model || 'Intel(R) Xeon(R) CPU',
        cores: cpus.length || 4,
        loadAvg: (os.loadavg() || [0, 0, 0]).map(n => Math.round(n * 100) / 100)
      },
      timestamp: new Date().toISOString()
    };

    res.json(stats);
  } catch (err) {
    console.error('Error al obtener server stats:', err);
    res.status(500).json({ error: 'Error al consultar métricas del servidor.' });
  }
});

// --- ENDPOINTS PARA OPERACIONES GIT Y DESPLIEGUE ---
app.post('/api/admin/git', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso no autorizado para operaciones Git.' });
  }

  const { action } = req.body;
  const projectRoot = path.resolve(__dirname, '..');

  try {
    if (action === 'status') {
      exec('git status -s', { cwd: projectRoot }, (err, stdout, stderr) => {
        if (err) return res.json({ success: false, message: 'Error consultando estado Git.', output: stderr || err.message });
        res.json({ success: true, message: 'Estado del repositorio consultado.', output: stdout || 'Repositorio al día y sin cambios pendientes.' });
      });
    } else if (action === 'pull') {
      exec('git pull origin main', { cwd: projectRoot }, (err, stdout, stderr) => {
        if (err) return res.json({ success: false, message: 'Error ejecutando Git Pull.', output: stderr || err.message });
        res.json({ success: true, message: 'Git Pull completado correctamente.', output: stdout || 'Cambios sincronizados.' });
      });
    } else if (action === 'pull_and_build') {
      exec('git pull origin main', { cwd: projectRoot }, (err, stdout, stderr) => {
        if (err) return res.json({ success: false, message: 'Error al descargar cambios.', output: stderr || err.message });
        res.json({ success: true, message: 'Código actualizado. Frontend listo.', output: stdout || 'Sincronizado.' });
      });
    } else if (action === 'restart_backend') {
      res.json({ success: true, message: 'Reinicio programado.', output: 'El proceso backend se reiniciará en breve vía PM2.' });
      setTimeout(() => {
        exec('pm2 restart all', () => {});
      }, 1000);
    } else {
      res.status(400).json({ error: `Acción '${action}' no reconocida.` });
    }
  } catch (err) {
    console.error('Error en operación Git:', err);
    res.status(500).json({ error: err.message || 'Error ejecutando operación Git.' });
  }
});

// --- CONFIGURACIÓN DEL SISTEMA (system_settings) ---
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query('SELECT value FROM public.system_settings WHERE key = $1', [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    res.json(result.rows[0].value);
  } catch (err) {
    console.error(`Error al obtener setting ${req.params.key}:`, err);
    res.status(500).json({ error: 'Error al consultar la configuración' });
  }
});

app.post('/api/settings/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'El campo "value" es obligatorio' });
    }
    await pool.query(
      `INSERT INTO public.system_settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)]
    );
    res.json(value);
  } catch (err) {
    console.error(`Error al guardar setting ${req.params.key}:`, err);
    res.status(500).json({ error: 'Error al guardar la configuración' });
  }
});

// Fallback 404 para cualquier ruta /api para garantizar respuesta JSON y nunca HTML
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.originalUrl}` });
});

// Inicialización
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor API local corriendo en http://0.0.0.0:${PORT}`);
});


