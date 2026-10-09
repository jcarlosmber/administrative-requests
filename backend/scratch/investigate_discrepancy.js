require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool();

async function run() {
  console.log('=== INVESTIGACIÓN DISCREPANCIA PERNO vs PLANTA ===\n');

  // 1. En Base de Datos
  try {
    const pernoDB = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado_funcionario = 'A' AND fecha_retiro IS NULL THEN 1 END) as activos,
        COUNT(CASE WHEN estado_funcionario = 'R' OR fecha_retiro IS NOT NULL THEN 1 END) as retirados
      FROM public.personal_perno_sjd
    `);
    console.log('DB personal_perno_sjd:', pernoDB.rows[0]);

    const plantaDB = await pool.query(`
      SELECT 
        COUNT(*) as total_plazas,
        COUNT(CASE WHEN estado_cargo = 'OCUPADO' THEN 1 END) as ocupadas,
        COUNT(CASE WHEN estado_cargo = 'VACANTE DEFINITIVA' THEN 1 END) as vacantes_def,
        COUNT(CASE WHEN estado_cargo = 'VACANTE TEMPORAL' THEN 1 END) as vacantes_temp
      FROM public.planta_personal_sjd
    `);
    console.log('DB planta_personal_sjd:', plantaDB.rows[0]);
  } catch (e) {
    console.log('Error consultando DB:', e.message);
  }

  // 2. En Mock Data
  const mockPernoPath = path.resolve(__dirname, '../../frontend/lib/pernoMockData.json');
  const mockPlantaPath = path.resolve(__dirname, '../../frontend/lib/plantaMockData.json');
  
  const pernoMock = JSON.parse(fs.readFileSync(mockPernoPath, 'utf8'));
  const plantaMock = JSON.parse(fs.readFileSync(mockPlantaPath, 'utf8'));

  console.log('\n--- MOCK DATA ---');
  console.log('Total registros PERNO Mock:', pernoMock.length);
  const pernoActivos = pernoMock.filter(p => p.estado_funcionario === 'A' && !p.fecha_retiro);
  const pernoRetirados = pernoMock.filter(p => p.estado_funcionario === 'R' || !!p.fecha_retiro);
  console.log('PERNO Activos (A y sin retiro):', pernoActivos.length);
  console.log('PERNO Retirados:', pernoRetirados.length);

  console.log('\nTotal plazas PLANTA Mock:', plantaMock.length);
  const plazasPorEstado = {};
  plantaMock.forEach(p => {
    plazasPorEstado[p.estado_cargo] = (plazasPorEstado[p.estado_cargo] || 0) + 1;
  });
  console.log('Plazas Planta Mock por estado:', plazasPorEstado);

  // 3. Cruce entre PERNO Activos y Planta
  console.log('\n--- CRUCE DETALLADO ---');
  // Cédulas de titulares en planta
  const titularesCedulas = new Set(plantaMock.filter(p => p.titular_cedula).map(p => String(p.titular_cedula).trim()));
  const encargadosCedulas = new Set(plantaMock.filter(p => p.encargo_cedula).map(p => String(p.encargo_cedula).trim()));

  console.log('Plazas con titular_cedula registrado:', titularesCedulas.size);
  console.log('Plazas con encargo_cedula registrado:', encargadosCedulas.size);

  // Cuántos activos de PERNO están como titular o encargo en Planta?
  const activosEnPlantaComoTitular = [];
  const activosEnPlantaComoEncargo = [];
  const activosSinNingunaPlaza = [];

  pernoActivos.forEach(p => {
    const ced = String(p.cedula).trim();
    const esTitular = titularesCedulas.has(ced);
    const esEncargo = encargadosCedulas.has(ced);

    if (esTitular) activosEnPlantaComoTitular.push(p);
    if (esEncargo) activosEnPlantaComoEncargo.push(p);
    if (!esTitular && !esEncargo) activosSinNingunaPlaza.push(p);
  });

  console.log('PERNO Activos que son Titulares en Planta:', activosEnPlantaComoTitular.length);
  console.log('PERNO Activos que son Encargados en Planta:', activosEnPlantaComoEncargo.length);
  console.log('PERNO Activos SIN PLAZA en Planta:', activosSinNingunaPlaza.length);

  if (activosSinNingunaPlaza.length > 0) {
    console.log('\nLista de Activos en PERNO sin plaza en Planta (Total: ' + activosSinNingunaPlaza.length + '):');
    activosSinNingunaPlaza.forEach(p => {
      console.log(`- C.C. ${p.cedula}: ${p.nombre_completo || (p.nombres + ' ' + p.primer_apellido)} | Cargo PERNO: ${p.cargo} | Tipo: ${p.tipo_funcionario} | Posición Planta PERNO: ${p.posicion_planta}`);
    });
  }

  // Cuántos funcionarios están en encargo pero también son titulares de otra plaza (doble conteo en planta vs 1 persona física)?
  const enEncargoYTitular = pernoActivos.filter(p => {
    const ced = String(p.cedula).trim();
    return titularesCedulas.has(ced) && encargadosCedulas.has(ced);
  });
  console.log('\nPERNO Activos que son Titular de una plaza Y Encargados en otra plaza simultáneamente:', enEncargoYTitular.length);
  enEncargoYTitular.forEach(p => {
    console.log(`- C.C. ${p.cedula}: ${p.nombre_completo || (p.nombres + ' ' + p.primer_apellido)}`);
  });

  // Revisemos las plazas ocupadas vs vacantes
  console.log('\nPlazas con estado_cargo == "OCUPADO":');
  const ocupadas = plantaMock.filter(p => p.estado_cargo === 'OCUPADO');
  console.log('Total OCUPADO:', ocupadas.length);
  const vacantesDef = plantaMock.filter(p => p.estado_cargo === 'VACANTE DEFINITIVA');
  console.log('Total VACANTE DEFINITIVA:', vacantesDef.length);
  const vacantesTemp = plantaMock.filter(p => p.estado_cargo === 'VACANTE TEMPORAL');
  console.log('Total VACANTE TEMPORAL:', vacantesTemp.length);

  // Cuántas plazas tienen titular pero están en encargo?
  const titularMasEncargo = plantaMock.filter(p => p.titular_nombre && p.encargo_nombre);
  console.log('Plazas que tienen Titular Y Encargado en la misma fila:', titularMasEncargo.length);

  await pool.end();
}

run().catch(console.error);
