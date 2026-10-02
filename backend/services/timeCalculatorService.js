/**
 * Servicio de Cálculo de Tiempos y Detección de Traslapes
 * Aplica reglas deterministas de experiencia laboral para el sector público colombiano.
 */

function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (clean === 'NO CONSTA' || clean.toUpperCase().includes('VIGENTE') || clean.toUpperCase().includes('ACTUAL')) {
    return null;
  }

  // Formato YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  // Formato DD/MM/YYYY o DD-MM-YYYY
  const latMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (latMatch) {
    const day = parseInt(latMatch[1], 10);
    const month = parseInt(latMatch[2], 10) - 1;
    const year = parseInt(latMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date) {
  if (!date) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calcula días, meses y años entre dos fechas inclusive.
 */
function calculatePeriod(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    return { dias_totales: 0, meses_totales: 0, anios: 0, meses: 0, dias: 0, valido: false };
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const dias_totales = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
  const meses_totales = Number((dias_totales / 30).toFixed(2));
  const anios = Math.floor(dias_totales / 365);
  const remDias = dias_totales % 365;
  const meses = Math.floor(remDias / 30);
  const dias = remDias % 30;

  return {
    dias_totales,
    meses_totales,
    anios,
    meses,
    dias,
    valido: true
  };
}

/**
 * Une intervalos superpuestos para no sumar días dobles (Interval Merging)
 */
function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];

    if (curr.start.getTime() <= prev.end.getTime()) {
      // Hay superposición, expandimos el fin
      if (curr.end.getTime() > prev.end.getTime()) {
        prev.end = curr.end;
      }
    } else {
      merged.push({ start: curr.start, end: curr.end });
    }
  }

  return merged;
}

/**
 * Audita traslapes entre todos los certificados y recalcula tiempos matemáticos.
 */
function auditCertificatesAndCalculateTotals(certificados, requisitoMinimoMeses = 54) {
  const processedCerts = [];
  const intervalsRelacionados = [];
  let sumaBrutaMesesRelacionados = 0;
  let sumaMesesNoRelacionados = 0;
  let requiereRevisionGlobal = false;
  const razonesRevision = [];

  // Paso 1: Parsear fechas y calcular periodos individuales
  for (let i = 0; i < certificados.length; i++) {
    const cert = { ...certificados[i] };
    const certId = cert.id_certificado || `CERT-${i + 1}`;
    cert.id_certificado = certId;

    const startDate = parseDate(cert.fecha_inicio);
    let endDate = parseDate(cert.fecha_fin);

    if (cert.vinculo_vigente && !endDate) {
      endDate = new Date(); // si está vigente se toma la fecha actual
    }

    if (!startDate || !endDate) {
      cert.fecha_incompleta = true;
      cert.observaciones = cert.observaciones || [];
      cert.observaciones.push('Fechas incompletas o no constan en el documento.');
      requiereRevisionGlobal = true;
      razonesRevision.push(`Certificado ${certId}: Fecha de inicio o fin incompleta/no legible.`);
      
      cert.tiempo_certificado = {
        anios: 0,
        meses: 0,
        dias: 0,
        meses_totales_aproximados: 0,
        metodo_calculo: 'NO_DETERMINABLE_POR_FECHA_INCOMPLETA'
      };
      cert.tiempo_valido = { anios: 0, meses: 0, dias: 0, meses_totales: 0 };
      cert.traslapes = [];
      processedCerts.push(cert);
      continue;
    }

    const calc = calculatePeriod(startDate, endDate);
    cert._startDate = startDate;
    cert._endDate = endDate;

    cert.tiempo_certificado = {
      anios: calc.anios,
      meses: calc.meses,
      dias: calc.dias,
      meses_totales_aproximados: calc.meses_totales,
      metodo_calculo: 'DIAS_EXACTOS_DIVIDIDO_30'
    };

    const esRelacionada = cert.experiencia_relacionada?.resultado === 'RELACIONADA' || cert.clasificacion_experiencia === 'RELACIONADA';

    if (esRelacionada) {
      sumaBrutaMesesRelacionados += calc.meses_totales;
      intervalsRelacionados.push({
        certId,
        start: startDate,
        end: endDate,
        meses: calc.meses_totales
      });
    } else {
      sumaMesesNoRelacionados += calc.meses_totales;
    }

    if (cert.documento?.estado === 'INCOMPLETO' || !cert.documento?.firma_visible || !cert.documento?.documento_legible) {
      requiereRevisionGlobal = true;
      razonesRevision.push(`Certificado ${certId}: Documento con firma no visible o ilegible.`);
    }

    if (cert.experiencia_relacionada?.resultado === 'REQUIERE_REVISION') {
      requiereRevisionGlobal = true;
      razonesRevision.push(`Certificado ${certId}: La clasificación funcional requiere revisión humana.`);
    }

    processedCerts.push(cert);
  }

  // Paso 2: Detección y detalle de traslapes individuales
  for (let i = 0; i < processedCerts.length; i++) {
    const c1 = processedCerts[i];
    c1.traslapes = [];
    if (!c1._startDate || !c1._endDate) continue;

    for (let j = 0; j < processedCerts.length; j++) {
      if (i === j) continue;
      const c2 = processedCerts[j];
      if (!c2._startDate || !c2._endDate) continue;

      // Calcular intersección
      const tStart = new Date(Math.max(c1._startDate.getTime(), c2._startDate.getTime()));
      const tEnd = new Date(Math.min(c1._endDate.getTime(), c2._endDate.getTime()));

      if (tStart <= tEnd) {
        const overlapCalc = calculatePeriod(tStart, tEnd);
        const isTotalCover = (c2._startDate.getTime() <= c1._startDate.getTime() && c2._endDate.getTime() >= c1._endDate.getTime());
        const tipoTraslape = isTotalCover ? 'TRASLAPE_TOTAL' : 'TRASLAPE_PARCIAL';

        if (isTotalCover && j < i) {
          c1.es_traslape_total = true;
        }

        c1.traslapes.push({
          otro_certificado_id: c2.id_certificado,
          entidad_coincidente: c2.entidad || 'Otra entidad',
          fecha_inicio_traslape: formatDate(tStart),
          fecha_fin_traslape: formatDate(tEnd),
          tipo: tipoTraslape,
          tiempo_a_excluir_meses: overlapCalc.meses_totales,
          explicacion: isTotalCover
            ? `Traslape total con ${c2.id_certificado} (${c2.entidad || 'N/A'}): su periodo completo queda cubierto entre ${formatDate(tStart)} y ${formatDate(tEnd)}.`
            : `Se superpone con ${c2.id_certificado} (${c2.entidad || 'N/A'}) entre ${formatDate(tStart)} y ${formatDate(tEnd)} (${overlapCalc.meses_totales} meses).`
        });
      }
    }

    // Tiempo individual neto para este certificado
    if (c1.es_traslape_total) {
      c1.tiempo_valido = { dias_totales: 0, meses_totales: 0, anios: 0, meses: 0, dias: 0, valido: true };
    } else {
      c1.tiempo_valido = { ...c1.tiempo_certificado };
    }
  }

  // Paso 3: Consolidación sin duplicar días (Interval Merging matemático)
  const mergedIntervals = mergeIntervals(intervalsRelacionados.map(item => ({
    start: new Date(item.start.getTime()),
    end: new Date(item.end.getTime())
  })));

  let mesesNetosRelacionados = 0;
  for (const interval of mergedIntervals) {
    const p = calculatePeriod(interval.start, interval.end);
    mesesNetosRelacionados += p.meses_totales;
  }
  mesesNetosRelacionados = Number(mesesNetosRelacionados.toFixed(2));

  const tiempoExcluidoPorTraslapes = Number(Math.max(0, sumaBrutaMesesRelacionados - mesesNetosRelacionados).toFixed(2));
  const diferenciaMeses = Number((mesesNetosRelacionados - requisitoMinimoMeses).toFixed(2));

  let resultadoFinal = 'REQUIERE_REVISION';
  let justificacion = '';

  if (requiereRevisionGlobal) {
    resultadoFinal = 'REQUIERE_REVISION';
    justificacion = `El expediente requiere revisión humana debido a: ${razonesRevision.join('; ')}`;
  } else if (mesesNetosRelacionados >= requisitoMinimoMeses) {
    resultadoFinal = 'CUMPLE';
    justificacion = `Acredita ${mesesNetosRelacionados} meses de experiencia profesional relacionada neta (superando los ${requisitoMinimoMeses} meses exigidos por una diferencia de +${diferenciaMeses} meses). Se excluyeron ${tiempoExcluidoPorTraslapes} meses por traslapes.`;
  } else {
    resultadoFinal = 'NO_CUMPLE';
    justificacion = `No acredita el tiempo requerido. Presenta ${mesesNetosRelacionados} meses de experiencia profesional relacionada neta frente a ${requisitoMinimoMeses} meses exigidos (faltan ${Math.abs(diferenciaMeses)} meses).`;
  }

  // Limpiar propiedades temporales de Date
  processedCerts.forEach(c => {
    delete c._startDate;
    delete c._endDate;
  });

  return {
    certificados: processedCerts,
    consolidado: {
      experiencia_relacionada_meses: mesesNetosRelacionados,
      experiencia_no_relacionada_meses: Number(sumaMesesNoRelacionados.toFixed(2)),
      tiempo_excluido_por_traslapes_meses: tiempoExcluidoPorTraslapes,
      requisito_minimo_meses: requisitoMinimoMeses,
      diferencia_meses: diferenciaMeses,
      resultado_final: resultadoFinal,
      justificacion: justificacion,
      faltantes: diferenciaMeses < 0 ? [`Faltan ${Math.abs(diferenciaMeses)} meses de experiencia profesional relacionada.`] : [],
      requiere_revision_humana: requiereRevisionGlobal
    }
  };
}

module.exports = {
  parseDate,
  formatDate,
  calculatePeriod,
  mergeIntervals,
  auditCertificatesAndCalculateTotals
};
