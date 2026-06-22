const ldap = require('ldapjs');
require('dotenv').config();

const LDAP_HOST = process.env.LDAP_HOST || '10.54.80.5';
const LDAP_FALLBACK_HOST = process.env.LDAP_FALLBACK_HOST || '10.54.80.6';
const LDAP_PORT = parseInt(process.env.LDAP_PORT || '389', 10);
const LDAP_BASE_DN = process.env.LDAP_BASE_DN || 'DC=SECJUR,DC=GOV,DC=CO';
const LDAP_USER_SEARCH_BASE = process.env.LDAP_USER_SEARCH_BASE || 'OU=Secretaria Juridica,DC=SECJUR,DC=GOV,DC=CO';

// Usuarios de prueba para simulación en desarrollo (cuando no hay acceso a las IPs de intranet)
const SIMULATED_USERS = [
  {
    username: 'jcmartinezb',
    email: 'jcmartinezb@secretariajuridica.gov.co',
    name: 'Juan Carlos Martínez',
    dependency: 'Subdirección de Informática',
    password: 'passwordLdap123'
  }
];

/**
 * Crea un cliente LDAP y maneja errores de conexión básicos
 */
function createClient(host) {
  const protocol = process.env.LDAP_PROTOCOL || 'ldap';
  const url = `${protocol}://${host}:${LDAP_PORT}`;
  return ldap.createClient({
    url: url,
    connectTimeout: 7000, // Mayor tiempo de espera para conexiones VPN/intranet
    timeout: 10000
  });
}

/**
 * Busca detalles de un usuario una vez que el cliente está autenticado
 */
function searchUser(client, usernameOrEmail) {
  return new Promise((resolve, reject) => {
    // Buscar por correo o por sAMAccountName (usuario de red)
    const filter = `(|(sAMAccountName=${usernameOrEmail})(mail=${usernameOrEmail}))`;
    
    client.search(LDAP_USER_SEARCH_BASE, {
      scope: 'sub',
      filter: filter,
      attributes: ['displayName', 'cn', 'mail', 'sAMAccountName', 'department']
    }, (err, res) => {
      if (err) return reject(err);

      let userEntry = null;

      res.on('searchEntry', (entry) => {
        userEntry = entry.object;
      });

      res.on('error', (err) => {
        reject(err);
      });

      res.on('end', (result) => {
        if (!userEntry) {
          resolve(null);
        } else {
          // Extraer información mapeada
          const name = userEntry.displayName || userEntry.cn || 'Usuario AD';
          const email = userEntry.mail || '';
          const username = userEntry.sAMAccountName || '';
          const dependency = userEntry.department || 'Secretaría Jurídica';
          resolve({ name, email, username, dependency });
        }
      });
    });
  });
}

/**
 * Intenta autenticar al usuario contra el servidor LDAP especificado
 */
function tryAuthenticateHost(host, usernameOrEmail, password) {
  return new Promise((resolve, reject) => {
    let client;
    try {
      client = createClient(host);
    } catch (e) {
      return reject(e);
    }

    let isFinished = false;

    client.on('error', (err) => {
      if (!isFinished) {
        isFinished = true;
        try { client.destroy(); } catch (e) {}
        reject(err);
      }
    });

    // Extraer el nombre de usuario simple (sAMAccountName)
    // Ejemplo: jcmartinezb@secretariajuridica.gov.co -> jcmartinezb
    // Ejemplo: SECJUR\jcmartinezb -> jcmartinezb
    const simpleUsername = usernameOrEmail.split('@')[0].split('\\').pop();

    // Intentar bind con el formato DOMINIO\usuario (NetBIOS)
    // Extraemos el dominio principal del primer componente del LDAP_BASE_DN (e.g. SECJUR)
    const netbiosDomain = (LDAP_BASE_DN.match(/DC=([^,]+)/i) || [null, 'SECJUR'])[1].toUpperCase();
    const bindDN = `${netbiosDomain}\\${simpleUsername}`;

    console.log(`LDAP: Intentando bind en ${host} con DN: ${bindDN}`);

    client.bind(bindDN, password, (err) => {
      if (isFinished) return;

      if (err) {
        isFinished = true;
        try { client.destroy(); } catch (e) {}
        
        // Si el error es credenciales inválidas (código 49 de LDAP)
        if (err.name === 'InvalidCredentialsError' || (err.message && err.message.includes('49'))) {
          resolve({ success: false, reason: 'Credenciales de Directorio Activo inválidas' });
        } else {
          reject(err);
        }
        return;
      }

      // Si el bind fue exitoso, buscamos los atributos del usuario
      searchUser(client, simpleUsername)
        .then((userData) => {
          if (isFinished) return;
          isFinished = true;
          try { client.destroy(); } catch (e) {}

          if (userData) {
            resolve({ success: true, user: userData });
          } else {
            resolve({
              success: true,
              user: {
                name: simpleUsername,
                email: usernameOrEmail.includes('@') ? usernameOrEmail : `${simpleUsername}@secjur.gov.co`,
                username: simpleUsername,
                dependency: 'Secretaría Jurídica'
              }
            });
          }
        })
        .catch((searchErr) => {
          if (isFinished) return;
          isFinished = true;
          try { client.destroy(); } catch (e) {}

          resolve({
            success: true,
            user: {
              name: simpleUsername,
              email: usernameOrEmail.includes('@') ? usernameOrEmail : `${simpleUsername}@secjur.gov.co`,
              username: simpleUsername,
              dependency: 'Secretaría Jurídica'
            }
          });
        });
    });
  });
}

/**
 * Autenticación LDAP principal con failover y modo simulación
 */
async function authenticate(usernameOrEmail, password) {
  // 1. Verificar si estamos en modo simulación
  const simpleUser = usernameOrEmail.split('@')[0].toLowerCase();
  const simulated = SIMULATED_USERS.find(
    u => (u.username.toLowerCase() === simpleUser || u.email.toLowerCase() === usernameOrEmail.toLowerCase())
  );

  // Intentamos autenticar con el host primario
  try {
    console.log(`Intentando conectar a LDAP principal: ${LDAP_HOST}...`);
    const result = await tryAuthenticateHost(LDAP_HOST, usernameOrEmail, password);
    return result;
  } catch (errPrimary) {
    console.warn(`Fallo de conexión con LDAP principal: ${errPrimary.message}. Probando fallback...`);

    // Intentamos con el host secundario (Tolerancia a fallos)
    try {
      console.log(`Intentando conectar a LDAP secundario: ${LDAP_FALLBACK_HOST}...`);
      const result = await tryAuthenticateHost(LDAP_FALLBACK_HOST, usernameOrEmail, password);
      return result;
    } catch (errSecondary) {
      console.error(`Ambos servidores LDAP fallaron de red: ${errSecondary.message}`);

      // Si ambos fallan y coincide con un usuario de simulación, permitimos simular para desarrollo
      if (simulated) {
        if (simulated.password === password) {
          console.log(`[SIMULACIÓN] Autenticación LDAP exitosa para usuario: ${usernameOrEmail}`);
          return {
            success: true,
            user: {
              name: simulated.name,
              email: simulated.email,
              username: simulated.username,
              dependency: simulated.dependency
            }
          };
        } else {
          return { success: false, reason: 'Credenciales de Directorio Activo inválidas (Simulado)' };
        }
      }

      // Si no es un usuario simulado, propagamos el error de conexión
      throw new Error('No se pudo establecer conexión con los servidores del Directorio Activo (LDAP).');
    }
  }
}

module.exports = {
  authenticate
};
