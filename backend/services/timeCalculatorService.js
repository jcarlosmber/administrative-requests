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
 * Calcula días, meses y años entre dos fechas según la función oficial DATEDIF de Excel
 * y la convención laboral colombiana (Decreto 1083 / formato FT-318 SJD).
 */
function calculatePeriod(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    return { dias_totales: 0, meses_totales: 0, anios: 0, meses: 0, dias: 0, valido: false };
  }

  // Algoritmo idéntico a DATEDIF de Excel (estándar formato FT-318 de la SJD)
  let y1 = startDate.getUTCFullYear(), m1 = startDate.getUTCMonth(), day1 = startDate.getUTCDate();
  let y2 = endDate.getUTCFullYear(), m2 = endDate.getUTCMonth(), day2 = endDate.getUTCDate();

  let anios = y2 - y1;
  if (m2 < m1 || (m2 === m1 && day2 < day1)) {
    anios--;
  }

  let meses = m2 - m1;
  if (day2 < day1) {
    meses--;
  }
  if (meses < 0) {
    meses += 12;
  }

  let dias = 0;
  if (day2 >= day1) {
    dias = day2 - day1;
  } else {
    let prevMonthLastDay = new Date(Date.UTC(y2, m2, 0)).getUTCDate();
    dias = prevMonthLastDay - day1 + day2;
  }

  // Convención laboral/civil colombiana (Decreto 1083 / Función Pública / FT-318):
  // Cada 30 días equivale a 1 mes comercial (y 360 días a 1 año laboral).
  // Por ejemplo: 0a, 11m, 30d equivale a 11 + (30/30) = 12 meses exactos (1 año).
  const meses_totales = Number(((anios * 12) + meses + (dias / 30)).toFixed(2));
  const dias_totales = (anios * 360) + (meses * 30) + dias;

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
 * Obtiene la fecha de corte profesional a partir de la formación académica:
 * Prioridad 1: Terminación y aprobación de materias / pénsum (Decreto 1083 de 2015)
 * Prioridad 2: Fecha de grado universitaria (Diploma / Acta de grado)
 */
function obtenerFechaCorteProfesional(formacionAcademica) {
  if (!Array.isArray(formacionAcademica) || formacionAcademica.length === 0) {
    return null;
  }

  // Filtrar títulos que habilitan experiencia profesional (Pregrados / Carreras Profesionales)
  const pregrados = formacionAcademica.filter(f => {
    const tipo = (f.tipo || '').toUpperCase();
    const titulo = (f.titulo_obtenido || '').toUpperCase();
    if (tipo === 'BACHILLER' || tipo === 'TARJETA_PROFESIONAL') return false;
    return tipo === 'PREGRADO' || 
           tipo.includes('PROFESIONAL') ||
           titulo.includes('ABOGAD') || 
           titulo.includes('PROFESIONAL') || 
           titulo.includes('INGENIER') || 
           titulo.includes('ADMINISTRADOR') || 
           titulo.includes('ECONOMISTA') || 
           titulo.includes('CONTADOR') || 
           titulo.includes('PSICOLOG') || 
           titulo.includes('MEDIC') || 
           titulo.includes('LICENCIAD');
  });

  const lista = pregrados.length > 0 ? pregrados : formacionAcademica.filter(f => (f.tipo || '').toUpperCase() !== 'BACHILLER');
  if (lista.length === 0) return null;

  let mejorFecha = null;
  let origenCorte = 'FECHA_GRADO';
  let fechaGradoStr = null;
  let fechaPensumStr = null;
  let certificaPensum = false;
  let tituloCorte = '';

  for (const item of lista) {
    const pensumDate = parseDate(item.fecha_terminacion_materias || item.fecha_terminacion_pensum);
    const gradoDate = parseDate(item.fecha_grado || item.fecha_expedicion);

    // Prioridad Decreto 1083/2015: si aportó certificación de materias aprobadas / terminación de pénsum
    if (pensumDate && (item.certifica_terminacion_materias === true || item.certifica_terminacion_pensum === true)) {
      if (!mejorFecha || pensumDate < mejorFecha) {
        mejorFecha = pensumDate;
        origenCorte = 'TERMINACION_PENSUM';
        fechaPensumStr = formatDate(pensumDate);
        certificaPensum = true;
        tituloCorte = item.titulo_obtenido;
      }
    } else if (gradoDate) {
      if (!mejorFecha || gradoDate < mejorFecha) {
        mejorFecha = gradoDate;
        origenCorte = 'FECHA_GRADO';
        fechaGradoStr = formatDate(gradoDate);
        tituloCorte = item.titulo_obtenido;
      }
    }
  }

  if (!mejorFecha) return null;

  return {
    fechaCorte: mejorFecha,
    fechaCorteStr: formatDate(mejorFecha),
    origenCorte,
    fechaGradoStr: fechaGradoStr || formatDate(mejorFecha),
    fechaPensumStr,
    certificaPensum,
    tituloCorte
  };
}

/**
 * Audita traslapes entre todos los certificados y recalcula tiempos matemáticos
 * aplicando la regla del Decreto 1083 de 2015, Ley 2039 de 2020 y Decreto 952 de 2021.
 */
function auditCertificatesAndCalculateTotals(certificados, requisitoMinimoMeses = 54, formacionAcademica = []) {
  const processedCerts = [];
  const intervalsRelacionados = [];
  let sumaBrutaMesesRelacionados = 0;
  let sumaMesesNoRelacionados = 0;
  let requiereRevisionGlobal = false;
  const razonesRevision = [];

  // Obtener fecha de corte profesional
  const infoCorte = obtenerFechaCorteProfesional(formacionAcademica);

  // Paso 1: Parsear fechas, auditar corte profesional y calcular periodos individuales
  const usedCertIds = new Set();
  for (let i = 0; i < certificados.length; i++) {
    const cert = { ...certificados[i] };
    let certId = cert.id_certificado || `CERT-${i + 1}`;
    if (usedCertIds.has(certId)) {
      certId = `CERT-${i + 1}`;
    }
    usedCertIds.add(certId);
    cert.id_certificado = certId;
    cert.observaciones = cert.observaciones || [];

    const startDate = parseDate(cert.fecha_inicio);
    let endDate = parseDate(cert.fecha_fin);

    if (cert.vinculo_vigente && !endDate) {
      endDate = parseDate(cert.fecha_expedicion) || new Date(); // si está vigente sin fecha_fin se toma fecha de expedición o actual
    }

    if (!startDate || !endDate) {
      cert.fecha_incompleta = true;
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

    // -------------------------------------------------------------------------
    // VALIDACIÓN DE EXPERIENCIA PROFESIONAL PREVIA AL GRADO (D. 1083/15 y L. 2039/20)
    // -------------------------------------------------------------------------
    let fechaInicioEfectiva = startDate;
    let esPreviaAlGrado = false;
    let cumpleLey2039 = false;
    let modalidadLey2039 = 'NINGUNA_EXPERIENCIA_REGULAR';
    let decisionComputo = 'POSTERIOR_AL_GRADO';

    if (infoCorte && infoCorte.fechaCorte) {
      if (startDate.getTime() < infoCorte.fechaCorte.getTime()) {
        esPreviaAlGrado = true;

        // Comprobar si cumple modalidades de Ley 2039 de 2020 y Decreto 952 de 2021
        const textoBuscar = `${cert.cargo_certificado || ''} ${cert.tipo_vinculo || ''} ${(cert.funciones_certificadas || []).map(f => f.funcion || '').join(' ')}`.toUpperCase();
        const esPractica = textoBuscar.includes('PRACTICA') || textoBuscar.includes('PRÁCTICA');
        const esPasantia = textoBuscar.includes('PASANTIA') || textoBuscar.includes('PASANTÍA');
        const esJudicatura = textoBuscar.includes('JUDICATURA') || textoBuscar.includes('JUDICANTE');
        const esMonitoria = textoBuscar.includes('MONITORIA') || textoBuscar.includes('MONITORÍA') || textoBuscar.includes('MONITOR');
        const esAprendizaje = textoBuscar.includes('APRENDIZAJE') || textoBuscar.includes('CONTRATO DE APRENDIZAJE');
        const esInvestigacion = textoBuscar.includes('INVESTIGADOR') || textoBuscar.includes('AUXILIAR DE INVESTIGACION');

        const esModalidadValida = cert.cumple_excepcion_ley_2039 === true || esPractica || esPasantia || esJudicatura || esMonitoria || esAprendizaje || esInvestigacion;
        const esRelacionadaConProfesion = cert.relacionada_con_profesion !== false && esRelacionada;

        if (esModalidadValida && esRelacionadaConProfesion) {
          cumpleLey2039 = true;
          modalidadLey2039 = esJudicatura ? 'JUDICATURA' : esPractica ? 'PRACTICA_LABORAL' : esPasantia ? 'PASANTIA' : esMonitoria ? 'MONITORIA' : esInvestigacion ? 'INVESTIGACION' : 'CONTRATO_APRENDIZAJE';
          decisionComputo = 'COMPUTABLE_TOTAL_LEY_2039';
          cert.observaciones.push(`Experiencia previa al grado reconocida conforme a Ley 2039 de 2020 y Decreto 952 de 2021 (${modalidadLey2039}).`);
        } else {
          // NO cumple excepción Ley 2039 de 2020 -> No computable como profesional
          cumpleLey2039 = false;
          if (endDate.getTime() <= infoCorte.fechaCorte.getTime()) {
            // Periodo completamente previo al corte -> Se clasifica como Experiencia Laboral
            decisionComputo = 'LABORAL_PREVIA_AL_GRADO';
            cert.clasificacion_experiencia = 'LABORAL';
            cert.tipo_experiencia = 'LABORAL';
            cert.es_laboral_previa = true;
            cert.observaciones.push(`Periodo previo al título de pregrado / terminación de pénsum (${infoCorte.fechaCorteStr}). Clasificado como Experiencia Laboral.`);
            cert.tiempo_valido = { ...calc };
          } else {
            // Inició antes y terminó después -> Se divide en 2 tramos: Tramo 1 Laboral (previo), Tramo 2 Profesional / Relacionada (desde fechaCorte)
            decisionComputo = 'COMPUTABLE_PARCIAL_DESDE_CORTE';
            fechaInicioEfectiva = infoCorte.fechaCorte;
            cert._startDate = fechaInicioEfectiva; // ajustar inicio para tramo profesional posterior
            const fechaFinTramoPrevio = new Date(infoCorte.fechaCorte.getTime() - 86400000);
            const periodoPrevioLaboral = calculatePeriod(startDate, fechaFinTramoPrevio);
            
            cert.se_divide_en_dos = true;
            cert.tramo_previo = {
              clasificacion: 'LABORAL',
              tipo_experiencia: 'LABORAL',
              fecha_inicio: formatDate(startDate),
              fecha_fin: formatDate(fechaFinTramoPrevio),
              tiempo: periodoPrevioLaboral,
              observacion: `Experiencia laboral previa al título de pregrado / terminación de pénsum (${infoCorte.fechaCorteStr}).`
            };
            cert.tramo_posterior = {
              clasificacion: esRelacionada ? 'RELACIONADA' : 'PROFESIONAL',
              tipo_experiencia: esRelacionada ? 'RELACIONADA' : 'PROFESIONAL',
              fecha_inicio: infoCorte.fechaCorteStr,
              fecha_fin: formatDate(endDate),
              observacion: esRelacionada ? 'Experiencia profesional relacionada con las funciones del cargo.' : 'Experiencia profesional no relacionada.'
            };
            cert.clasificacion_experiencia = esRelacionada ? 'RELACIONADA' : 'PROFESIONAL';
            cert.observaciones.push(`Se divide en 2 tramos: ${periodoPrevioLaboral.meses_totales} meses como Experiencia Laboral previa al grado (${infoCorte.fechaCorteStr}) y el tramo posterior como Experiencia ${esRelacionada ? 'Relacionada' : 'Profesional'}.`);
            sumaMesesNoRelacionados += periodoPrevioLaboral.meses_totales;
          }
        }
      }
    }

    // Registro estructurado de la validación de experiencia previa
    cert.verificacion_experiencia_previa = {
      es_previa_al_grado: esPreviaAlGrado,
      fecha_corte_profesional: infoCorte ? infoCorte.fechaCorteStr : 'NO APLICA',
      origen_corte: infoCorte ? infoCorte.origenCorte : 'NO CONSTA',
      terminacion_pensum_verificada: infoCorte ? infoCorte.certificaPensum : false,
      terminacion_pensum_detalle: infoCorte?.certificaPensum 
        ? `Certificación universitaria con fecha de terminación y aprobación de materias: ${infoCorte.fechaPensumStr}`
        : (infoCorte?.fechaGradoStr ? `Fecha de grado según diploma/acta: ${infoCorte.fechaGradoStr} (sin certificación de materias)` : 'No consta fecha de corte profesional'),
      relacion_profesion_verificada: esRelacionada,
      relacion_profesion_detalle: esRelacionada
        ? 'Las funciones certificadas corresponden y guardan relación con la disciplina del cargo.'
        : 'Las funciones certificadas no corresponden al perfil profesional exigido.',
      tipo_experiencia_previa_ley2039: cumpleLey2039,
      modalidad_ley2039: modalidadLey2039,
      tipo_experiencia_previa_detalle: cumpleLey2039
        ? `Modalidad formativa acreditada conforme a Ley 2039 de 2020 y Decreto 952 de 2021 (${modalidadLey2039}).`
        : (esPreviaAlGrado ? 'Experiencia laboral ordinaria sin constancia de práctica, pasantía ni judicatura según Ley 2039 de 2020.' : 'Experiencia posterior a la fecha de grado/pénsum.'),
      decision_computo: decisionComputo,
      fecha_inicio_computable: formatDate(fechaInicioEfectiva)
    };

    // Calcular meses válidos y sumatorias
    if (decisionComputo === 'NO_COMPUTABLE_PREVIA_AL_GRADO') {
      sumaMesesNoRelacionados += calc.meses_totales;
    } else if (decisionComputo === 'COMPUTABLE_PARCIAL_DESDE_CORTE') {
      const calcValido = calculatePeriod(fechaInicioEfectiva, endDate);
      cert.tiempo_valido = { ...calcValido };
      if (esRelacionada) {
        sumaBrutaMesesRelacionados += calcValido.meses_totales;
        intervalsRelacionados.push({
          certId,
          start: fechaInicioEfectiva,
          end: endDate,
          meses: calcValido.meses_totales
        });
      } else {
        sumaMesesNoRelacionados += calcValido.meses_totales;
      }
    } else {
      cert.tiempo_valido = { ...calc };
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
