/**
 * iduTramosService.js
 * Servicio especializado para la división y cotejo funcional oficial de la
 * certificación laboral del Instituto de Desarrollo Urbano (IDU) para Gustavo Adolfo Sánchez Monroy.
 * Radicado STRH-0516-C 293 / 20225161763721.
 */

const fs = require('fs');
const path = require('path');
const tc = require('./timeCalculatorService');

const tramosArchivo = path.join(__dirname, '../scratch/idu_6_cargos_cruzados.json');

function obtenerTramosIDUOficiales() {
  if (fs.existsSync(tramosArchivo)) {
    try {
      const data = JSON.parse(fs.readFileSync(tramosArchivo, 'utf8'));
      return data.map((t, idx) => {
        const p = tc.calculatePeriod(tc.parseDate(t.fecha_inicio), tc.parseDate(t.fecha_fin));
        return {
          id_certificado: `CERT-${idx + 1}`,
          entidad: t.entidad || 'Instituto de Desarrollo Urbano - IDU',
          nit_entidad: '899.999.098-1',
          ciudad_expedicion: 'Bogotá, D.C.',
          fecha_expedicion: '2022-11-10',
          firmante: 'Juan Sebastián Jiménez Leal',
          cargo_firmante: 'Subdirector Técnico de Recursos Humanos',
          tipo_vinculo: t.tipo_vinculo,
          cargo_certificado: t.cargo_certificado,
          codigo_cargo: t.codigo_cargo,
          grado_cargo: t.grado_cargo,
          dependencia: t.dependencia,
          numero_contrato_o_acto: t.numero_contrato_o_acto,
          fecha_inicio: t.fecha_inicio,
          fecha_fin: t.fecha_fin,
          vinculo_vigente: t.vinculo_vigente || false,
          funciones_certificadas: t.funciones.map(f => ({
            num: f.num,
            funcion: f.texto,
            evidencia_textual: `${f.num}. ${f.texto}`
          })),
          experiencia_profesional: true,
          clasificacion_experiencia: 'RELACIONADA',
          experiencia_relacionada: t.experiencia_relacionada_json,
          tiempo_certificado: {
            anios: p.anios,
            meses: p.meses,
            dias: p.dias,
            meses_totales_aproximados: p.meses_totales,
            dias_totales: p.dias_totales,
            metodo_calculo: 'DATEDIF_LABORAL_COLOMBIANO'
          },
          tiempo_valido: {
            anios: p.anios,
            meses: p.meses,
            dias: p.dias,
            meses_totales: p.meses_totales
          },
          traslapes: idx === 5 ? [{
            tipo: 'SIMULTANEO_ENCARGO',
            cert_solapado: 'CERT-5',
            dias_traslapados: p.dias_totales,
            meses_traslapados: p.meses_totales,
            descripcion: 'Periodo de encargo transitorio desempeñado simultáneamente dentro del vínculo en Carrera Administrativa (CERT-5)'
          }] : [],
          verificacion_formal: {
            corresponde_aspirante: true,
            aspirante_nombre_doc: 'GUSTAVO ADOLFO SÁNCHEZ MONROY (C.C. 79.906.841)',
            entidad_identificable: true,
            entidad_nombre: 'Instituto de Desarrollo Urbano - IDU',
            suscriptor_identificable: true,
            suscriptor_nombre_cargo_calidad: 'Juan Sebastián Jiménez Leal - Subdirector Técnico de Recursos Humanos',
            cuenta_con_firma: true,
            tipo_firma: 'Firma electrónica/mecánica válida',
            fecha_expedicion_identificable: true,
            fecha_expedicion: '2022-11-10',
            documento_legible_integro: true,
            detalle_legibilidad: 'Certificación oficial radicada STRH-0516-C 293 / 20225161763721 de 11 páginas íntegra y legible.',
            mecanismos_contacto_verificacion: true,
            mecanismos_contacto_cuales: 'Calle 22 No. 6 - 27, Tel: 3386660, www.idu.gov.co, Bogotá D.C.'
          },
          documento: {
            firma_visible: true,
            fecha_visible: true,
            entidad_identificable: true,
            documento_legible: true,
            estado: 'COMPLETO'
          },
          observaciones: [
            t.resumen_cruce_sintesis,
            t.cotejo_detallado_texto
          ],
          nombre_archivo: 'CERTIFICACION_LABORAL_IDU_GUSTAVO_SANCHEZ.pdf',
          anexos: ['CERTIFICACION_LABORAL_IDU_GUSTAVO_SANCHEZ.pdf']
        };
      });
    } catch (e) {
      console.error('Error leyendo tramos archivo:', e.message);
    }
  }
  return [];
}

async function aplicarTramosIDUAValidacion(pool, validacionId) {
  const client = await pool.connect();
  try {
    const certsOficiales = obtenerTramosIDUOficiales();
    if (certsOficiales.length === 0) {
      throw new Error('No se encontraron los datos de los 6 tramos oficiales del IDU.');
    }

    await client.query('BEGIN');

    // 1. Eliminar certificados existentes de IDU para esta validación
    await client.query(`
      DELETE FROM public.ingreso_certificados 
      WHERE validacion_id = $1 AND (entidad ILIKE '%idu%' OR entidad ILIKE '%desarrollo urbano%')
    `, [validacionId]);

    // 2. Insertar los 6 tramos nuevos
    for (const cert of certsOficiales) {
      await client.query(`
        INSERT INTO public.ingreso_certificados (
          validacion_id, id_certificado, entidad, nit_entidad, ciudad_expedicion, fecha_expedicion,
          firmante, cargo_firmante, tipo_vinculo, cargo_certificado, codigo_cargo, grado_cargo,
          dependencia, numero_contrato_o_acto, fecha_inicio, fecha_fin, vinculo_vigente,
          funciones_certificadas, experiencia_profesional, clasificacion_experiencia,
          experiencia_relacionada_json, tiempo_certificado_json, meses_certificados,
          traslapes_json, tiempo_valido_meses, documento_json, observaciones_json, nombre_archivo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28);
      `, [
        validacionId,
        cert.id_certificado,
        cert.entidad,
        cert.nit_entidad,
        cert.ciudad_expedicion,
        cert.fecha_expedicion,
        cert.firmante,
        cert.cargo_firmante,
        cert.tipo_vinculo,
        cert.cargo_certificado,
        cert.codigo_cargo,
        cert.grado_cargo,
        cert.dependencia,
        cert.numero_contrato_o_acto,
        cert.fecha_inicio,
        cert.fecha_fin,
        cert.vinculo_vigente,
        JSON.stringify(cert.funciones_certificadas),
        cert.experiencia_profesional,
        cert.clasificacion_experiencia,
        JSON.stringify(cert.experiencia_relacionada),
        JSON.stringify(cert.tiempo_certificado),
        cert.tiempo_certificado.meses_totales_aproximados,
        JSON.stringify(cert.traslapes),
        cert.tiempo_valido.meses_totales,
        JSON.stringify({ ...cert.documento, verificacion_formal: cert.verificacion_formal }),
        JSON.stringify(cert.observaciones),
        cert.nombre_archivo
      ]);
    }

    // 3. Consultar todos los certificados actuales de la validación para recalcular consolidados
    const todosCertsRes = await client.query(`
      SELECT * FROM public.ingreso_certificados WHERE validacion_id = $1 ORDER BY fecha_inicio ASC
    `, [validacionId]);

    const valRes = await client.query(`
      SELECT requisito_minimo_meses FROM public.ingreso_validaciones WHERE id = $1
    `, [validacionId]);

    const reqMeses = Number(valRes.rows[0]?.requisito_minimo_meses) || 54;

    const certsParaRecalculo = todosCertsRes.rows.map(r => ({
      id: r.id,
      id_certificado: r.id_certificado,
      fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin,
      clasificacion_experiencia: r.clasificacion_experiencia || 'RELACIONADA',
      tipo_vinculo: r.tipo_vinculo,
      cargo_certificado: r.cargo_certificado
    }));

    const consolidadoRecalculado = tc.recalcularTiempos(certsParaRecalculo, reqMeses);

    // 4. Actualizar la validación con los nuevos consolidados
    await client.query(`
      UPDATE public.ingreso_validaciones
      SET experiencia_relacionada_meses = $1,
          experiencia_no_relacionada_meses = $2,
          tiempo_excluido_traslapes_meses = $3,
          diferencia_meses = $4,
          resultado_final = $5,
          justificacion_final = $6,
          updated_at = NOW()
      WHERE id = $7
    `, [
      consolidadoRecalculado.experiencia_relacionada_meses,
      consolidadoRecalculado.experiencia_no_relacionada_meses,
      consolidadoRecalculado.tiempo_excluido_por_traslapes_meses,
      consolidadoRecalculado.diferencia_meses,
      consolidadoRecalculado.resultado_final,
      consolidadoRecalculado.justificacion,
      validacionId
    ]);

    await client.query('COMMIT');
    return {
      success: true,
      mensaje: 'Certificación del IDU dividida exitosamente en 6 tramos con cruce funcional completo.',
      consolidado: consolidadoRecalculado,
      total_certificados: certsOficiales.length
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  obtenerTramosIDUOficiales,
  aplicarTramosIDUAValidacion
};
