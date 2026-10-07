/**
 * backend/ajustar_idu.js
 * Script para ajustar en la base de datos la certificación de IDU en 6 tramos
 * con su respectivo cruce funcional para Gustavo Adolfo Sánchez Monroy (79906841).
 */

const { Pool } = require('pg');
require('dotenv').config();
const iduTramosService = require('./services/iduTramosService');

const pool = new Pool();

async function ejecutar() {
  console.log('===============================================================');
  console.log('INICIANDO AJUSTE OFICIAL DE 6 TRAMOS IDU EN BASE DE DATOS...');
  console.log('===============================================================');

  try {
    const busq = await pool.query(`
      SELECT v.id, c.nombre, c.documento 
      FROM public.ingreso_validaciones v
      JOIN public.ingreso_candidatos c ON v.candidato_id = c.id
      WHERE c.documento ILIKE '%79906841%' 
         OR c.nombre ILIKE '%Gustavo%Sanchez%'
      ORDER BY v.created_at DESC LIMIT 1
    `);

    if (busq.rows.length === 0) {
      console.log('⚠ No se encontró ninguna validación registrada para Gustavo Adolfo Sánchez (79906841).');
      console.log('Por favor asegúrate de haber creado o analizado previamente su expediente.');
      return;
    }

    const val = busq.rows[0];
    console.log(`✓ Validación identificada: ID ${val.id} | Candidato: ${val.nombre} (C.C. ${val.documento})`);

    console.log('Aplicando división en 6 tramos con cruce funcional detallado...');
    const res = await iduTramosService.aplicarTramosIDUAValidacion(pool, val.id);

    console.log('\n✓ RESULTADO:');
    console.log(`- Éxito: ${res.success}`);
    console.log(`- Mensaje: ${res.mensaje}`);
    console.log(`- Total de tramos insertados: ${res.total_certificados}`);
    console.log(`- Experiencia relacionada consolidada: ${res.consolidado.experiencia_relacionada_meses} meses`);
    console.log(`- Experiencia no relacionada: ${res.consolidado.experiencia_no_relacionada_meses} meses`);
    console.log(`- Tiempo excluido por traslapes/encargos: ${res.consolidado.tiempo_excluido_por_traslapes_meses} meses`);
    console.log(`- Diferencia frente al requisito: ${res.consolidado.diferencia_meses} meses`);
    console.log(`- Decisión final: ${res.consolidado.resultado_final}`);
    console.log('\n✓ El expediente ha sido actualizado con éxito en el sistema.');
  } catch (err) {
    console.error('✗ ERROR durante la ejecución del ajuste:', err.message);
  } finally {
    await pool.end();
  }
}

ejecutar();
