require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool();

// Función para generar un correo institucional estándar si no existe
function generateEmail(fullName) {
  const clean = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/);
  
  if (clean.length === 1) return `${clean[0]}@secretariajuridica.gov.co`;
  if (clean.length === 2) return `${clean[0][0]}${clean[1]}@secretariajuridica.gov.co`;
  if (clean.length === 3) return `${clean[0][0]}${clean[1]}@secretariajuridica.gov.co`;
  // Para 4 nombres: Nombre1 Nombre2 Apellido1 Apellido2 -> nna1a2
  return `${clean[0][0]}${clean[1][0]}${clean[2]}${clean[3] ? clean[3][0] : ''}@secretariajuridica.gov.co`;
}

// Función para generar un username
function generateUsername(fullName) {
  const clean = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/);
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0][0]}${clean[1]}`;
  return `${clean[0][0]}${clean[1][0]}${clean[2]}`;
}

const rotativeList = [
  {
    name: 'ADDILY JOHANNA CALA CASTRO',
    doc: '53166058',
    plate: 'ZYO 048',
    brand: 'CHEVROLET',
    model: 'TRACKER',
    color: 'GRIS',
    ext: '1568',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'ALEX CORTES SALGADO',
    doc: '79138328',
    plate: 'DBR-147',
    brand: 'CHEVROLET',
    model: 'Automóvil',
    color: 'VERDE',
    ext: '1581',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'ALMA ROSA RAMOS MARIA',
    doc: '64586540',
    plate: 'EJP-399',
    brand: 'SUZUKI',
    model: 'BALENO',
    color: 'GRIS',
    ext: '1771',
    dependency: 'DIRECCIÓN DISTRITAL DE POLITICA E INFORMATICA'
  },
  {
    name: 'BRICEIDA ALVARADO ROJAS',
    doc: '60348229',
    plate: 'NPZ-730',
    brand: 'BYD',
    model: 'HIBRIDO',
    color: 'ROJO',
    ext: '1567',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'CARLOS JULIO RAMIREZ MUÑOZ',
    doc: '80267904',
    plate: 'HKX 468',
    brand: 'CHEVROLET',
    model: 'CAPTIVA',
    color: 'NEGRO',
    ext: '',
    dependency: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS'
  },
  {
    name: 'DORA BELEN GUTIERREZ HERNANDEZ',
    doc: '51649014',
    plate: 'DMZ 200',
    brand: 'CHEVROLET',
    model: 'TRACKER',
    color: 'ROJO',
    ext: '1577',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'DORIS SILVA GARCIA',
    doc: '52557124',
    plate: 'NCT 246',
    brand: 'CHEVROLET',
    model: 'SPARK GT',
    color: 'PLATA',
    ext: '1667',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'DUVAN SANDOVAL RODRIGUEZ',
    doc: '93371977',
    plate: 'EJU 400',
    brand: 'NISSAN',
    model: 'VERSA',
    color: 'ROJO',
    ext: '1688',
    dependency: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS'
  },
  {
    name: 'EURANIO JOSE MANOTAS MALDINADO',
    doc: '8526853',
    plate: 'LYM260',
    brand: 'TOYOTA',
    model: 'Automóvil',
    color: 'GRIS',
    ext: '',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'FERNANDO PACHON PIÑEROS',
    doc: '79567977',
    plate: 'BND 516',
    brand: 'RENAULT',
    model: 'MEGANE',
    color: 'GRIS',
    ext: '1689',
    dependency: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS'
  },
  {
    name: 'GLORIA ESTHER SALCEDO TAMAYO',
    doc: '28963444',
    plate: 'JFW-870',
    brand: 'VOLKSWAGEN',
    model: 'GOL',
    color: 'PLATA',
    ext: '',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'GLORIA INES MARTINEZ ORTIZ',
    doc: '52171949',
    plate: 'RCT-278',
    brand: 'NISSAN',
    model: 'TIIDA',
    color: 'BEIGE',
    ext: '1573',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'HENRY ALBERTO GONZALEZ MOLINA',
    doc: '79450267',
    plate: 'PDW-097',
    brand: 'MG',
    model: 'Automóvil',
    color: 'PLATA',
    ext: '1656',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'JOHANA PATRICIA GAMEZ GOMEZ',
    doc: '59015269',
    plate: 'CCY-467',
    brand: 'CHEVROLET',
    model: 'ZAFIRA',
    color: 'Particular',
    ext: '1685',
    dependency: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS'
  },
  {
    name: 'JOSE ORLANDO ALVARADO HERREÑO',
    doc: '79316619',
    plate: 'KZY186',
    brand: 'MAZDA',
    model: 'CX30',
    color: 'ROJO',
    ext: '1753',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'JUAN CARLOS MARTINEZ BERNAL',
    doc: '1032448684',
    plate: 'GWM368',
    brand: 'VOLKSWAGEN',
    model: 'Automóvil',
    color: 'GRIS',
    ext: '1610',
    dependency: 'OFICINA ASESORA DE PLANEACIÓN'
  },
  {
    name: 'LUZ ESPERANZA GARCIA CARDONA',
    doc: '52768137',
    plate: 'IMT 758',
    brand: 'RENAULT',
    model: 'SANDERO',
    color: 'ROJO',
    ext: '',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'MAGDA EDITH GUERRERO BONILLA',
    doc: '23582747',
    plate: 'DOS 520',
    brand: 'SSANGYONG',
    model: 'KORANDO',
    color: 'GRIS',
    ext: '',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'MARTHA LILIANA BARRERA DIAZ',
    doc: '51937185',
    plate: 'PHO-169',
    brand: 'BYD',
    model: 'ELECTRICO',
    color: 'BLANCO',
    ext: '1579',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'SAMUEL ARTURO HERNANDEZ MURCIA',
    doc: '80022321',
    plate: 'EJU-269',
    brand: 'VOLKSWAGEN',
    model: 'Automóvil',
    color: 'PLATA',
    ext: '1572',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'SANDRA NICOLASA ORGANISTA BUILES',
    doc: '52646082',
    plate: 'ZZM-146',
    brand: 'CHEVROLET',
    model: 'Automóvil',
    color: 'NEGRO',
    ext: '',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'SONIA TERESA ROA SILVA',
    doc: '1018435583',
    plate: 'JMW-507',
    brand: 'HYUNDAI',
    model: 'ACCENT',
    color: 'GRIS',
    ext: '1657',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'VICTOR HERNANDO MURILLO',
    doc: '79361343',
    plate: 'CXU666',
    brand: 'Particular',
    model: 'Automóvil',
    color: 'Particular',
    ext: '',
    dependency: 'OFICINA DE CONTROL INTERNO'
  },
  {
    name: 'ADRIANA PATRICIA RAMIREZ BAUTISTA',
    doc: '52542976',
    plate: 'RCN 822',
    brand: 'KIA',
    model: 'RIO XCITE',
    color: 'GRIS',
    ext: '1630',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'ALVARO ARDILA MORA',
    doc: '79709902',
    plate: 'GLW-023',
    brand: 'BMW',
    model: 'X3',
    color: 'BLANCO',
    ext: '1662',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'ALVARO CAMILO BERNATE NAVARRO',
    doc: '79802044',
    plate: 'KXV215',
    brand: 'MAZDA',
    model: 'HIBRIDO',
    color: 'ROJO',
    ext: '1648',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'CAMILO ANDRES RODRIGUEZ RODRIGUEZ',
    doc: '79954654',
    plate: 'JBX-115',
    brand: 'FORD',
    model: 'EDGE',
    color: 'GRIS',
    ext: '1768',
    dependency: 'DIRECCIÓN DISTRITAL DE POLITICA E INFORMATICA'
  },
  {
    name: 'CAROLINA LOZANO ARDILA',
    doc: '52454621',
    plate: 'LMS655',
    brand: 'SUZUKI',
    model: 'SWIFT',
    color: 'AZUL Y NEGRO',
    ext: '1622',
    dependency: 'OFICINA DE CONTROL INTERNO'
  },
  {
    name: 'CHEILA ALEXANDRA ALVARADO ROJAS',
    doc: '52337438',
    plate: 'MKY-153',
    brand: 'RENAULT',
    model: 'SANDERO',
    color: 'BEIGE',
    ext: '1569',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'CRISTHIAM DAVID JIMENEZ VASQUEZ',
    doc: '1110573560',
    plate: 'NSQ061',
    brand: 'TOYOTA',
    model: 'Automóvil',
    color: 'BLANCO',
    ext: '1647',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'DAVID ALEJANDRO MORA BERMUDEZ',
    doc: '1032479676',
    plate: 'RKQ-273',
    brand: 'CHEVROLET',
    model: 'SPARK GT',
    color: 'NEGRO',
    ext: '1759',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'DONALDO YAMITH ZABALETA TABOADA',
    doc: '1064976255',
    plate: 'MGZ841',
    brand: 'HYUNDAI',
    model: 'Automóvil',
    color: 'NEGRO',
    ext: '1648',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'DORA RAQUEL BARRERA PALACIO',
    doc: '1030597508',
    plate: 'GBT-893',
    brand: 'MITSUBISHI',
    model: 'Automóvil',
    color: 'PLATA',
    ext: '1563',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'Hugo Hernando Aguirre Corrales',
    doc: '75093516',
    plate: 'URT165',
    brand: 'MAZDA',
    model: '3',
    color: 'Rojo',
    ext: '',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'IVAN DAVID RAMIREZ VALENCIA',
    doc: '16077540',
    plate: 'MBQ-121',
    brand: 'NISSAN',
    model: 'MARCH',
    color: 'ROJO',
    ext: '1758',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'JENIFFER GUTIERREZ GUTIERREZ',
    doc: '53066719',
    plate: 'LOY-864',
    brand: 'TOYOTA',
    model: 'Automóvil',
    color: 'GRIS',
    ext: '1758',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'JUAN DIEGO ACOSTA TORRES',
    doc: '1085338624',
    plate: 'MYN-584',
    brand: 'MAZDA',
    model: '2',
    color: 'ROJO',
    ext: '1645',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'LAURA JULIANA ARIZA',
    doc: '',
    plate: 'DVL-205',
    brand: 'SUZUKI',
    model: 'S-CROSS',
    color: 'GRIS',
    ext: '',
    dependency: 'DESPACHO SECRETARIA JURIDICA'
  },
  {
    name: 'LINA MARCELA MELO RODRIGUEZ',
    doc: '52033530',
    plate: 'JDR733',
    brand: 'CHEVROLET',
    model: 'TRACKER',
    color: 'NEGRO',
    ext: '1687',
    dependency: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS'
  },
  {
    name: 'LUIS ALFONSO CASTIBLANCO URQUIJO',
    doc: '3085860',
    plate: 'URS-165',
    brand: 'RENAULT',
    model: 'DUSTER',
    color: 'NEGRO',
    ext: '1673',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'LUIS CARLOS GAONA FARIAS',
    doc: '1022362951',
    plate: 'NEM-455',
    brand: 'VOLKSWAGEN',
    model: 'JETTA',
    color: 'GRIS',
    ext: '1575',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'LUZ DARY MERCHAN LARA',
    doc: '52176512',
    plate: 'PZN-763',
    brand: 'TOYOTA',
    model: 'Automóvil',
    color: 'BLANCO',
    ext: '1770',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'LUZ ESTELLA MORENO PEREZ',
    doc: '52868519',
    plate: 'LOR-941',
    brand: 'MAZDA',
    model: 'HIBRIDO',
    color: 'ROJO',
    ext: '1500',
    dependency: 'DESPACHO SECRETARIA JURIDICA'
  },
  {
    name: 'MARIA TERESA VALDERRAMA',
    doc: '41059054',
    plate: 'JWW545',
    brand: 'SUZUKI',
    model: 'ESPRESSO',
    color: 'GRIS',
    ext: '1749',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'MARIA XIMENA CUBIDES AMAYA',
    doc: '52818411',
    plate: 'MKV835',
    brand: 'BMW',
    model: 'Automóvil',
    color: 'BLANCO',
    ext: '1685',
    dependency: 'DIRECCIÓN DISTRITAL DE DOCTRINA Y ASUNTOS NORMATIVOS'
  },
  {
    name: 'MIGUEL ANGEL VARGAS CORDERO',
    doc: '1121816584',
    plate: 'EOK311',
    brand: 'RENAULT',
    model: 'LOGAN LITE',
    color: 'GRIS',
    ext: '1660',
    dependency: 'DIRECCIÓN DISTRITAL DE GESTION JUDICIAL'
  },
  {
    name: 'MIGUEL PINTO SEGURA',
    doc: '79584810',
    plate: 'HDT-513',
    brand: 'CHEVROLET',
    model: 'TRACKER',
    color: 'VINO TINTO',
    ext: '1763',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'NELCY TORRES MARTINEZ',
    doc: '40011063',
    plate: 'LOP-093',
    brand: 'NISSAN',
    model: 'VERSA 2024',
    color: 'NEGRO',
    ext: '1645',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'NELSON JULIAN SALAZAR URRUTIA',
    doc: '79569642',
    plate: 'EMR 672',
    brand: 'VOLKSWAGEN',
    model: 'GOL',
    color: 'GRIS',
    ext: '1517',
    dependency: 'OFICINA ASESORA DE PLANEACIÓN'
  },
  {
    name: 'OCTAVIO QUINTERO LARA',
    doc: '19444915',
    plate: 'RGQ 584',
    brand: 'PEUGEOT',
    model: 'Automóvil',
    color: 'NEGRO',
    ext: '1752',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'PEDRO ALFONSO MEJIA SIERRA',
    doc: '79575101',
    plate: 'PGM-621',
    brand: 'ELECTRICO',
    model: 'Automóvil',
    color: 'BLANCO',
    ext: '1566',
    dependency: 'DIRECCIÓN DE GESTIÓN CORPORATIVA'
  },
  {
    name: 'YUDY ZULEIMA RODRIGUEZ BLANCO',
    doc: '52380066',
    plate: 'MKZ381',
    brand: 'KIA',
    model: 'SPORTAGE',
    color: 'AZUL',
    ext: '1756',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'MAGDA PATRICIA PUENTES',
    doc: '52519358',
    plate: 'IPZ 211',
    brand: 'KIA',
    model: 'Automóvil',
    color: 'Particular',
    ext: '',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'ANDRES FABIAN NOSSA',
    doc: '80826518',
    plate: 'IZC 45E',
    brand: 'SUZUKI',
    model: 'Automóvil',
    color: 'AZUL',
    ext: '',
    dependency: 'DIRECCIÓN DISTRITAL DE INSPECCIÓN, VIGILANCIA Y CONTROL'
  },
  {
    name: 'ANDREA DEL PILAR CARDENAS SARMIENTO',
    doc: '',
    plate: 'HIS 646',
    brand: 'RENAULT',
    model: 'Automóvil',
    color: 'GRIS',
    ext: '',
    dependency: 'DIRECCIÓN DE ASUNTOS DISCIPLINARIOS'
  }
];

async function seedRotative() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`Iniciando registro de ${rotativeList.length} vehículos y funcionarios de parqueadero no fijo...`);

    let usersCreated = 0;
    let vehiclesCreated = 0;

    for (const item of rotativeList) {
      const email = generateEmail(item.name);
      const username = generateUsername(item.name);

      // 1. Buscar o crear usuario en public.users
      let userId = null;
      const userRes = await client.query(
        'SELECT id FROM public.users WHERE LOWER(name) = LOWER($1) OR LOWER(email) = LOWER($2)',
        [item.name.trim(), email]
      );

      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].id;
        await client.query(
          `UPDATE public.users 
           SET phone = COALESCE(phone, $1),
               dependency = COALESCE(dependency, $2)
           WHERE id = $3`,
          [item.ext || null, item.dependency, userId]
        );
      } else {
        const insUser = await client.query(
          `INSERT INTO public.users 
           (name, email, username, phone, dependency, role, ldap_enabled, is_active)
           VALUES ($1, $2, $3, $4, $5, 'funcionario', true, true)
           RETURNING id`,
          [item.name.trim(), email, username, item.ext || null, item.dependency]
        );
        userId = insUser.rows[0].id;
        usersCreated++;
      }

      // 2. Insertar / Actualizar vehículo en public.user_vehicles
      const cleanPlate = item.plate.trim().toUpperCase();
      const vehNotes = item.ext ? `Parqueadero Rotativo / No Fijo - Ext: ${item.ext}` : 'Parqueadero Rotativo / No Fijo';

      const exVeh = await client.query(
        'SELECT id FROM public.user_vehicles WHERE UPPER(TRIM(plate)) = $1',
        [cleanPlate]
      );

      if (exVeh.rows.length > 0) {
        await client.query(
          `UPDATE public.user_vehicles 
           SET user_id = $1,
               name = $2,
               doc = $3,
               brand = $4,
               model = $5,
               color = $6,
               dependency = $7,
               charge = 'Funcionario',
               is_active = true,
               approval_status = 'aprobado',
               assigned_spot_id = NULL,
               notes = $8,
               updated_at = NOW()
           WHERE id = $9`,
          [userId, item.name.trim(), item.doc || null, item.brand, item.model, item.color, item.dependency, vehNotes, exVeh.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO public.user_vehicles 
           (user_id, plate, brand, model, color, name, doc, dependency, charge, is_active, approval_status, assigned_spot_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Funcionario', true, 'aprobado', NULL, $9)`,
          [userId, cleanPlate, item.brand, item.model, item.color, item.name.trim(), item.doc || null, item.dependency, vehNotes]
        );
        vehiclesCreated++;
      }
    }

    await client.query('COMMIT');
    console.log(`¡Proceso completado! Usuarios nuevos: ${usersCreated}, Vehículos registrados: ${vehiclesCreated}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar vehículos rotativos:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRotative();
