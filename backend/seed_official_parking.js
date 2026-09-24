require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool();

async function seedOfficialParking() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Iniciando vinculación de celdas, funcionarios y vehículos oficiales...');

    // 1. Catálogo de Funcionarios / Usuarios
    const usersData = [
      {
        email: 'dahernandez@secretariajuridica.gov.co',
        name: 'Daniel Andrés Hernández',
        dependency: 'Despacho Secretaría Jurídica',
        role: 'funcionario',
        charge: 'Funcionario'
      },
      {
        email: 'waburgos@secretariajuridica.gov.co',
        name: 'William Alexander Burgos',
        dependency: 'Subsecretaría Jurídica Distrital',
        role: 'funcionario',
        charge: 'Funcionario'
      },
      {
        email: 'eaurregob@secretariajuridica.gov.co',
        name: 'Eduardo Alejandro Urrego Becerra',
        dependency: 'Dirección de Gestión Corporativa',
        role: 'funcionario',
        charge: 'Conductor'
      },
      {
        email: 'mtmejiar@secretariajuridica.gov.co',
        name: 'Maria Tatiana Mejia',
        dependency: 'Despacho Secretaría Jurídica',
        role: 'funcionario',
        charge: 'Funcionario'
      },
      {
        email: 'caguarinp@secretariajuridica.gov.co',
        name: 'Camilo Alfonso Guarin Prieto',
        dependency: 'Dirección Distrital de Inspección, Vigilancia y Control',
        role: 'directivo',
        charge: 'Director Distrital'
      },
      {
        email: 'lyperear@secretariajuridica.gov.co',
        name: 'Leidy Yulieth Pera Ramirez',
        dependency: 'Oficina de Control Interno',
        role: 'directivo',
        charge: 'Jefe de Oficina'
      },
      {
        email: 'ojsuarez@secretariajuridica.gov.co',
        name: 'Oscar Javier Suarez Ramos',
        dependency: 'Oficina de las Tecnologías de la Información y las Comunicaciones',
        role: 'directivo',
        charge: 'Jefe de Oficina TIC'
      },
      {
        email: 'pgomezm@secretariajuridica.gov.co',
        name: 'Paola Gómez Martinez',
        dependency: 'Dirección de Gestión Corporativa',
        role: 'directivo',
        charge: 'Directora de Gestión Corporativa'
      },
      {
        email: 'amortizm@secretariajuridica.gov.co',
        name: 'Andres Mauricio Ortiz Maya',
        dependency: 'Dirección Distrital de Gestión Judicial',
        role: 'directivo',
        charge: 'Director Distrital'
      },
      {
        email: 'apuentesd@secretariajuridica.gov.co',
        name: 'Andres Felipe Puentes Diaz',
        dependency: 'Dirección Distrital de Doctrina',
        role: 'directivo',
        charge: 'Director Distrital'
      },
      {
        email: 'mlortegam@secretariajuridica.gov.co',
        name: 'Marina Luz Ortega Montero',
        dependency: 'Dirección de Asuntos Disciplinarios',
        role: 'directivo',
        charge: 'Directora Distrital'
      }
    ];

    const userMap = {}; // email -> id

    for (const u of usersData) {
      const existing = await client.query('SELECT id, name, role FROM public.users WHERE LOWER(email) = LOWER($1)', [u.email]);
      if (existing.rows.length > 0) {
        userMap[u.email.toLowerCase()] = existing.rows[0].id;
        await client.query(
          `UPDATE public.users 
           SET name = COALESCE(name, $1), 
               dependency = COALESCE(dependency, $2),
               role = COALESCE(role, $3)
           WHERE id = $4`,
          [u.name, u.dependency, u.role, existing.rows[0].id]
        );
      } else {
        const ins = await client.query(
          `INSERT INTO public.users 
           (email, name, role, dependency, ldap_enabled, is_active)
           VALUES ($1, $2, $3, $4, true, true)
           RETURNING id`,
          [u.email.toLowerCase(), u.name, u.role, u.dependency]
        );
        userMap[u.email.toLowerCase()] = ins.rows[0].id;
      }
    }

    // 2. Conductores oficiales en tabla drivers
    const driversData = [
      { name: 'JAUMI MANFRED MARROQUIN', phone: '79769334' },
      { name: 'LUIS DAUVINY DUARTE ROA', phone: '79417068' },
      { name: 'EDUARDO ALEJANDRO URREGO BECERRA', phone: '80100027' }
    ];

    for (const d of driversData) {
      const exD = await client.query('SELECT id FROM public.drivers WHERE UPPER(TRIM(name)) = UPPER(TRIM($1))', [d.name]);
      if (exD.rows.length === 0) {
        await client.query(
          'INSERT INTO public.drivers (name, phone, is_active) VALUES ($1, $2, true)',
          [d.name, d.phone]
        );
      }
    }

    // 3. Crear / actualizar Celdas Fijas
    const spotsData = [
      {
        code: '63',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'dahernandez@secretariajuridica.gov.co',
        user_name: 'Conductor: JAUMI MANFRED MARROQUIN (Despacho Secretaría Jurídica)',
        notes: 'Sótano 1 - Despacho Secretaría Jurídica (Vehículo Oficial)'
      },
      {
        code: '110',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'waburgos@secretariajuridica.gov.co',
        user_name: 'Conductor: LUIS DAUVINY DUARTE ROA (Subsecretaría Jurídica Distrital)',
        notes: 'Sótano 2 - Subsecretaría Jurídica Distrital (Vehículo Oficial)'
      },
      {
        code: '109',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'eaurregob@secretariajuridica.gov.co',
        user_name: 'Conductor: EDUARDO ALEJANDRO URREGO BECERRA (Dirección de Gestión Corporativa)',
        notes: 'Sótano 2 - Dirección de Gestión Corporativa (Vehículo Oficial)'
      },
      {
        code: '68',
        spot_type: 'fija',
        status: 'reservada',
        user_email: null,
        user_name: 'Dirección de Política e Informática Jurídica',
        notes: 'Sótano 2 - Asignada a Dirección de Política e Informática Jurídica'
      },
      {
        code: '80',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'mtmejiar@secretariajuridica.gov.co',
        user_name: 'MARIA TATIANA MEJIA',
        notes: 'Sótano 2 - Despacho Secretaría Jurídica (Personal)'
      },
      {
        code: '82',
        spot_type: 'fija',
        status: 'reservada',
        user_email: null,
        user_name: 'Despacho Secretaría Jurídica - Subsecretaría',
        notes: 'Sótano 2 - Despacho Subsecretaría'
      },
      {
        code: '75',
        spot_type: 'fija',
        status: 'reservada',
        user_email: null,
        user_name: 'Oficina Asesora de Planeación',
        notes: 'Sótano 2 - Oficina Asesora de Planeación'
      },
      {
        code: '78',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'caguarinp@secretariajuridica.gov.co',
        user_name: 'CAMILO ALFONSO GUARIN PRIETO',
        notes: 'Sótano 2 - Dirección Distrital de Inspección, Vigilancia y Control'
      },
      {
        code: '79',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'lyperear@secretariajuridica.gov.co',
        user_name: 'LEIDY YULIETH PERA RAMIREZ',
        notes: 'Sótano 2 - Oficina de Control Interno'
      },
      {
        code: '81',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'ojsuarez@secretariajuridica.gov.co',
        user_name: 'OSCAR JAVIER SUAREZ RAMOS',
        notes: 'Sótano 2 - Oficina de Tecnologías de la Información y las Comunicaciones (Motos BMW)'
      },
      {
        code: '83',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'pgomezm@secretariajuridica.gov.co',
        user_name: 'PAOLA GÓMEZ MARTINEZ',
        notes: 'Sótano 2 - Dirección de Gestión Corporativa'
      },
      {
        code: '72',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'amortizm@secretariajuridica.gov.co',
        user_name: 'ANDRES MAURICIO ORTIZ MAYA',
        notes: 'Sótano 2 - Dirección Distrital de Gestión Judicial'
      },
      {
        code: '108',
        spot_type: 'fija',
        status: 'ocupada',
        user_email: 'apuentesd@secretariajuridica.gov.co',
        user_name: 'ANDRES FELIPE PUENTES DIAZ / MARINA LUZ ORTEGA MONTERO',
        notes: 'Sótano 2 - Dirección Distrital de Doctrina / Asuntos Disciplinarios'
      }
    ];

    const spotMap = {}; // code -> spot_id

    for (const s of spotsData) {
      const assignedUserId = s.user_email ? userMap[s.user_email.toLowerCase()] : null;
      
      const checkSpot = await client.query('SELECT id FROM public.parking_spots WHERE UPPER(TRIM(code)) = UPPER(TRIM($1))', [s.code]);
      if (checkSpot.rows.length > 0) {
        const spotId = checkSpot.rows[0].id;
        spotMap[s.code] = spotId;
        await client.query(
          `UPDATE public.parking_spots 
           SET spot_type = $1, 
               status = $2, 
               assigned_user_id = $3, 
               assigned_user_name = $4, 
               notes = $5, 
               updated_at = NOW() 
           WHERE id = $6`,
          [s.spot_type, s.status, assignedUserId, s.user_name, s.notes, spotId]
        );
      } else {
        const insSpot = await client.query(
          `INSERT INTO public.parking_spots 
           (code, spot_type, status, assigned_user_id, assigned_user_name, notes) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING id`,
          [s.code, s.spot_type, s.status, assignedUserId, s.user_name, s.notes]
        );
        spotMap[s.code] = insSpot.rows[0].id;
      }
    }

    // 4. Crear y Vincular Vehículos
    const vehiclesData = [
      {
        plate: 'OLO 452',
        brand: 'Nissan',
        model: 'Kicks',
        color: 'Oficial',
        name: 'Conductor: JAUMI MANFRED MARROQUIN',
        doc: '79769334',
        dependency: 'Despacho Secretaría Jurídica',
        user_email: 'dahernandez@secretariajuridica.gov.co',
        spot_code: '63',
        charge: 'Vehículo Oficial',
        notes: 'Vehículo Oficial Secretaría Jurídica'
      },
      {
        plate: 'OLO 454',
        brand: 'Nissan',
        model: 'Kicks',
        color: 'Oficial',
        name: 'Conductor: LUIS DAUVINY DUARTE ROA',
        doc: '79417068',
        dependency: 'Subsecretaría Jurídica Distrital',
        user_email: 'waburgos@secretariajuridica.gov.co',
        spot_code: '110',
        charge: 'Vehículo Oficial',
        notes: 'Vehículo Oficial Subsecretaría'
      },
      {
        plate: 'OLO 453',
        brand: 'Nissan',
        model: 'Kicks',
        color: 'Oficial',
        name: 'Conductor: EDUARDO ALEJANDRO URREGO BECERRA',
        doc: '80100027',
        dependency: 'Dirección de Gestión Corporativa',
        user_email: 'eaurregob@secretariajuridica.gov.co',
        spot_code: '109',
        charge: 'Vehículo Oficial',
        notes: 'Vehículo Oficial Gestión Corporativa'
      },
      {
        plate: 'LIS-222',
        brand: 'TOYOTA',
        model: 'Camioneta',
        color: 'Particular',
        name: 'MARIA TATIANA MEJIA',
        doc: '1121857540',
        dependency: 'Despacho Secretaría Jurídica',
        user_email: 'mtmejiar@secretariajuridica.gov.co',
        spot_code: '80',
        charge: 'Funcionario',
        notes: 'Vehículo Personal'
      },
      {
        plate: 'FYP 969',
        brand: 'MAZDA',
        model: 'Automóvil',
        color: 'Particular',
        name: 'CAMILO ALFONSO GUARIN PRIETO',
        doc: '80197320',
        dependency: 'Dirección Distrital de Inspección, Vigilancia y Control',
        user_email: 'caguarinp@secretariajuridica.gov.co',
        spot_code: '78',
        charge: 'Directivo',
        notes: 'Vehículo Personal 1'
      },
      {
        plate: 'QPT 481',
        brand: 'Particular',
        model: 'Automóvil',
        color: 'Particular',
        name: 'CAMILO ALFONSO GUARIN PRIETO',
        doc: '80197320',
        dependency: 'Dirección Distrital de Inspección, Vigilancia y Control',
        user_email: 'caguarinp@secretariajuridica.gov.co',
        spot_code: '78',
        charge: 'Directivo',
        notes: 'Vehículo Personal 2'
      },
      {
        plate: 'AVI-479',
        brand: 'KIA',
        model: 'SORENTO RADICAL',
        color: 'Particular',
        name: 'LEIDY YULIETH PERA RAMIREZ',
        doc: '1075208323',
        dependency: 'Oficina de Control Interno',
        user_email: 'lyperear@secretariajuridica.gov.co',
        spot_code: '79',
        charge: 'Directivo',
        notes: 'Vehículo Personal 1'
      },
      {
        plate: 'QPT 002',
        brand: 'Particular',
        model: 'Automóvil',
        color: 'Particular',
        name: 'LEIDY YULIETH PERA RAMIREZ',
        doc: '1075208323',
        dependency: 'Oficina de Control Interno',
        user_email: 'lyperear@secretariajuridica.gov.co',
        spot_code: '79',
        charge: 'Directivo',
        notes: 'Vehículo Personal 2'
      },
      {
        plate: 'MTZ 60E',
        brand: 'BMW',
        model: 'Moto',
        color: 'Particular',
        name: 'OSCAR JAVIER SUAREZ RAMOS',
        doc: '2968815',
        dependency: 'Oficina de las Tecnologías de la Información y las Comunicaciones',
        user_email: 'ojsuarez@secretariajuridica.gov.co',
        spot_code: '81',
        charge: 'Directivo',
        notes: 'Moto BMW 1'
      },
      {
        plate: 'IXI 27G',
        brand: 'BMW',
        model: 'Moto',
        color: 'Particular',
        name: 'OSCAR JAVIER SUAREZ RAMOS',
        doc: '2968815',
        dependency: 'Oficina de las Tecnologías de la Información y las Comunicaciones',
        user_email: 'ojsuarez@secretariajuridica.gov.co',
        spot_code: '81',
        charge: 'Directivo',
        notes: 'Moto BMW 2'
      },
      {
        plate: 'ZZK-608',
        brand: 'FORD',
        model: 'Camioneta',
        color: 'Particular',
        name: 'PAOLA GÓMEZ MARTINEZ',
        doc: '53082812',
        dependency: 'Dirección de Gestión Corporativa',
        user_email: 'pgomezm@secretariajuridica.gov.co',
        spot_code: '83',
        charge: 'Directivo',
        notes: 'Vehículo Personal 1'
      },
      {
        plate: 'JVR-551',
        brand: 'Particular',
        model: 'Automóvil',
        color: 'Particular',
        name: 'PAOLA GÓMEZ MARTINEZ',
        doc: '53082812',
        dependency: 'Dirección de Gestión Corporativa',
        user_email: 'pgomezm@secretariajuridica.gov.co',
        spot_code: '83',
        charge: 'Directivo',
        notes: 'Vehículo Personal 2'
      },
      {
        plate: 'GDR-992',
        brand: 'TOYOTA',
        model: 'Automóvil',
        color: 'Particular',
        name: 'ANDRES MAURICIO ORTIZ MAYA',
        doc: '1015406682',
        dependency: 'Dirección Distrital de Gestión Judicial',
        user_email: 'amortizm@secretariajuridica.gov.co',
        spot_code: '72',
        charge: 'Directivo',
        notes: 'Vehículo Personal'
      },
      {
        plate: 'PXN 655',
        brand: 'RENAULT',
        model: 'Blanco',
        color: 'Blanco',
        name: 'ANDRES FELIPE PUENTES DIAZ',
        doc: '1098810694',
        dependency: 'Dirección Distrital de Doctrina',
        user_email: 'apuentesd@secretariajuridica.gov.co',
        spot_code: '108',
        charge: 'Directivo',
        notes: 'Vehículo Personal - Dirección de Doctrina'
      }
    ];

    for (const v of vehiclesData) {
      const userId = userMap[v.user_email.toLowerCase()] || null;
      const spotId = spotMap[v.spot_code] || null;

      // Buscar si el vehículo ya existe por placa (sin importar espacios ni mayúsculas)
      const cleanPlate = v.plate.trim().toUpperCase();
      const exVeh = await client.query('SELECT id FROM public.user_vehicles WHERE UPPER(TRIM(plate)) = $1', [cleanPlate]);

      let vehicleId;
      if (exVeh.rows.length > 0) {
        vehicleId = exVeh.rows[0].id;
        await client.query(
          `UPDATE public.user_vehicles 
           SET user_id = $1,
               brand = $2,
               model = $3,
               color = $4,
               name = $5,
               doc = $6,
               dependency = $7,
               is_active = true,
               approval_status = 'aprobado',
               assigned_spot_id = $8,
               notes = $9,
               charge = $10,
               updated_at = NOW()
           WHERE id = $11`,
          [userId, v.brand, v.model, v.color, v.name, v.doc, v.dependency, spotId, v.notes, v.charge, vehicleId]
        );
      } else {
        const insVeh = await client.query(
          `INSERT INTO public.user_vehicles 
           (user_id, plate, brand, model, color, name, doc, dependency, is_active, approval_status, assigned_spot_id, notes, charge)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'aprobado', $9, $10, $11)
           RETURNING id`,
          [userId, cleanPlate, v.brand, v.model, v.color, v.name, v.doc, v.dependency, spotId, v.notes, v.charge]
        );
        vehicleId = insVeh.rows[0].id;
      }

      // Registro de auditoría en vehicle_history
      await client.query(
        `INSERT INTO public.vehicle_history 
         (vehicle_id, plate, action, performed_by_name, details)
         VALUES ($1, $2, 'asignacion_oficial_inicial', 'Administrador', $3)`,
        [vehicleId, cleanPlate, JSON.stringify({ spot_code: v.spot_code, titular: v.name, dependecia: v.dependency })]
      );
    }

    await client.query('COMMIT');
    console.log('¡Vinculación de celdas, usuarios y vehículos completada con éxito!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante la vinculación:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedOfficialParking();
