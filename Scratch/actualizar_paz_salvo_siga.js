const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'app', 'rrhh', 'vinculaciones-desvinculaciones.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Reemplazar la etapa 4 de Carrera Administrativa (d_carr_4)
const carreraRegex = /\{\s*id:\s*'d_carr_4'[\s\S]*?id:\s*'d_carr_5'/;
const carreraReplacement = `{
            id: 'd_carr_4',
            numero: 4,
            titulo: 'Paz y Salvo Electrónico',
            subtitulo: 'Circuito institucional gestionado en SIGA Trámites',
            icono: 'checkbox-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'SIGA Trámites / Talento Humano',
            normaGeneral: 'Procedimiento 2311420-PR-074 SJD; Sistema SIGA Trámites',
            plazoLegal: 'Trámite digital autónomo en SIGA Trámites',
            procedimientoDetallado: 'El trámite y validación del circuito de paz y salvo institucional (TIC, Almacén, Archivo y Talento Humano) se realiza de forma centralizada en el aplicativo SIGA Trámites (no aplica gestión en esta plataforma).',
            requisitos: [
              {
                id: 'dc4_1',
                label: 'Paz y Salvo Electrónico',
                cumplido: true,
                noAplica: true,
                obligatorio: false,
                norma: 'Procedimiento 2311420-PR-074 SJD • Sistema SIGA Trámites',
                textoNormativo: 'El circuito de paz y salvo de bienes, equipos, archivos y talento humano se gestiona electrónicamente mediante el sistema institucional SIGA Trámites.',
                detalleProcedimiento: 'No aplica gestión en esta plataforma. Se realiza en otro sistema (SIGA Trámites).',
                observaciones: 'No aplica se realiza en otro sistema (SIGA Tramites)',
                posiblesEvidencias: [
                  'Certificado o paz y salvo electrónico expedido por el sistema SIGA Trámites',
                ],
              },
            ],
          },
          {
            id: 'd_carr_5'`;

if (carreraRegex.test(content)) {
  content = content.replace(carreraRegex, carreraReplacement);
  console.log('Fase d_carr_4 actualizada');
} else {
  console.log('Aviso: No se pudo hacer match en d_carr_4');
}

// 2. Reemplazar la etapa 4 de Provisionalidad (d_prov_4)
const provRegex = /\{\s*id:\s*'d_prov_4'[\s\S]*?id:\s*'d_prov_5'/;
const provReplacement = `{
            id: 'd_prov_4',
            numero: 4,
            titulo: 'Paz y Salvo Electrónico',
            subtitulo: 'Circuito institucional gestionado en SIGA Trámites',
            icono: 'checkbox-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'SIGA Trámites / Talento Humano',
            normaGeneral: 'Procedimiento 2311420-PR-074 SJD; Sistema SIGA Trámites',
            plazoLegal: 'Trámite digital autónomo en SIGA Trámites',
            procedimientoDetallado: 'El trámite y validación del circuito de paz y salvo institucional (TIC, Almacén, Archivo y Talento Humano) se realiza de forma centralizada en el aplicativo SIGA Trámites (no aplica gestión en esta plataforma).',
            requisitos: [
              {
                id: 'dp4_1',
                label: 'Paz y Salvo Electrónico',
                cumplido: true,
                noAplica: true,
                obligatorio: false,
                norma: 'Procedimiento 2311420-PR-074 SJD • Sistema SIGA Trámites',
                textoNormativo: 'El circuito de paz y salvo de bienes, equipos, archivos y talento humano se gestiona electrónicamente mediante el sistema institucional SIGA Trámites.',
                detalleProcedimiento: 'No aplica gestión en esta plataforma. Se realiza en otro sistema (SIGA Trámites).',
                observaciones: 'No aplica se realiza en otro sistema (SIGA Tramites)',
                posiblesEvidencias: [
                  'Certificado o paz y salvo electrónico expedido por el sistema SIGA Trámites',
                ],
              },
            ],
          },
          {
            id: 'd_prov_5'`;

if (provRegex.test(content)) {
  content = content.replace(provRegex, provReplacement);
  console.log('Fase d_prov_4 actualizada');
} else {
  console.log('Aviso: No se pudo hacer match en d_prov_4');
}

// 3. Reemplazar la etapa 4 de Libre Nombramiento (d_lnr_4)
const lnrRegex = /\{\s*id:\s*'d_lnr_4'[\s\S]*?id:\s*'d_lnr_5'/;
const lnrReplacement = `{
            id: 'd_lnr_4',
            numero: 4,
            titulo: 'Paz y Salvo Electrónico',
            subtitulo: 'Circuito institucional gestionado en SIGA Trámites',
            icono: 'checkbox-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'SIGA Trámites / Talento Humano',
            normaGeneral: 'Procedimiento 2311420-PR-074 SJD; Sistema SIGA Trámites',
            plazoLegal: 'Trámite digital autónomo en SIGA Trámites',
            procedimientoDetallado: 'El trámite y validación del circuito de paz y salvo institucional (TIC, Almacén, Archivo y Talento Humano) se realiza de forma centralizada en el aplicativo SIGA Trámites (no aplica gestión en esta plataforma).',
            requisitos: [
              {
                id: 'dl4_1',
                label: 'Paz y Salvo Electrónico',
                cumplido: true,
                noAplica: true,
                obligatorio: false,
                norma: 'Procedimiento 2311420-PR-074 SJD • Sistema SIGA Trámites',
                textoNormativo: 'El circuito de paz y salvo de bienes directivos, equipos, archivos y talento humano se gestiona electrónicamente mediante el sistema institucional SIGA Trámites.',
                detalleProcedimiento: 'No aplica gestión en esta plataforma. Se realiza en otro sistema (SIGA Trámites).',
                observaciones: 'No aplica se realiza en otro sistema (SIGA Tramites)',
                posiblesEvidencias: [
                  'Certificado o paz y salvo electrónico expedido por el sistema SIGA Trámites',
                ],
              },
            ],
          },
          {
            id: 'd_lnr_5'`;

if (lnrRegex.test(content)) {
  content = content.replace(lnrRegex, lnrReplacement);
  console.log('Fase d_lnr_4 actualizada');
} else {
  console.log('Aviso: No se pudo hacer match en d_lnr_4');
}

// 4. Reemplazar la etapa 3 de Practicante / Judicante (d_prac_3)
const pracRegex = /\{\s*id:\s*'d_prac_3'[\s\S]*?id:\s*'d_prac_4'/;
const pracReplacement = `{
            id: 'd_prac_3',
            numero: 3,
            titulo: 'Paz y Salvo Formativo',
            subtitulo: 'Circuito institucional gestionado en SIGA Trámites',
            icono: 'checkbox-outline',
            estado: 'completed',
            tiempoEstimadoDias: 1,
            responsable: 'Tutor / SIGA Trámites / TH',
            normaGeneral: 'Procedimiento Institucional PR-137 SJD; Sistema SIGA Trámites',
            plazoLegal: 'Trámite digital autónomo en SIGA Trámites',
            procedimientoDetallado: 'El trámite y validación del paz y salvo formativo se realiza de manera centralizada en el aplicativo institucional SIGA Trámites (no aplica gestión en esta plataforma).',
            requisitos: [
              {
                id: 'dpj3_1',
                label: 'Paz y Salvo Electrónico',
                cumplido: true,
                noAplica: true,
                obligatorio: false,
                norma: 'Procedimiento Institucional PR-137 / PR-074 SJD • Sistema SIGA Trámites',
                textoNormativo: 'El paz y salvo de la judicatura o práctica formativa se tramita electrónicamente en el sistema institucional SIGA Trámites.',
                detalleProcedimiento: 'No aplica gestión en esta plataforma. Se realiza en otro sistema (SIGA Trámites).',
                observaciones: 'No aplica se realiza en otro sistema (SIGA Tramites)',
                posiblesEvidencias: [
                  'Certificado o paz y salvo formativo electrónico expedido por el sistema SIGA Trámites',
                ],
              },
            ],
          },
          {
            id: 'd_prac_4'`;

if (pracRegex.test(content)) {
  content = content.replace(pracRegex, pracReplacement);
  console.log('Fase d_prac_3 actualizada');
} else {
  console.log('Aviso: No se pudo hacer match en d_prac_3');
}

// 5. Ajustar limpiarEtapasParaNuevoTramite para preservar noAplica
const limpiarTarget = `export function limpiarEtapasParaNuevoTramite(etapas: EtapaFlujo[]): EtapaFlujo[] {
  return etapas.map((etapa, idx) => ({
    ...etapa,
    estado: idx === 0 ? 'in_progress' : 'pending',
    observacionesFase: undefined,
    requisitos: etapa.requisitos.map((req) => ({
      ...req,
      cumplido: false,
      fecha_cumplimiento: undefined,
      observaciones: undefined,
      radicadoSoporte: undefined,
      usuarioRegistro: undefined,
    })),
  }));
}`;

const limpiarReplacement = `export function limpiarEtapasParaNuevoTramite(etapas: EtapaFlujo[]): EtapaFlujo[] {
  return etapas.map((etapa, idx) => {
    const todosNoAplica = etapa.requisitos.length > 0 && etapa.requisitos.every((r) => r.noAplica);
    return {
      ...etapa,
      estado: todosNoAplica ? 'completed' : idx === 0 ? 'in_progress' : 'pending',
      observacionesFase: undefined,
      requisitos: etapa.requisitos.map((req) => {
        if (req.noAplica) {
          return {
            ...req,
            cumplido: true,
            noAplica: true,
            observaciones: req.observaciones || 'No aplica se realiza en otro sistema (SIGA Tramites)',
          };
        }
        return {
          ...req,
          cumplido: false,
          fecha_cumplimiento: undefined,
          observaciones: undefined,
          radicadoSoporte: undefined,
          usuarioRegistro: undefined,
        };
      }),
    };
  });
}`;

if (content.includes(limpiarTarget)) {
  content = content.replace(limpiarTarget, limpiarReplacement);
  console.log('limpiarEtapasParaNuevoTramite actualizado');
} else {
  const targetCRLF = limpiarTarget.replace(/\n/g, '\r\n');
  const repCRLF = limpiarReplacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, repCRLF);
    console.log('limpiarEtapasParaNuevoTramite actualizado (CRLF)');
  }
}

// 6. En sincronizarEtapasCaso, forzar que reqM.label === 'Paz y Salvo Electrónico' quede como no aplica y completed
const sincTarget = `      // Reconciliación para Requisito 4 de la Fase 6 (Renuncia al cargo anterior en Ascenso)
      if (reqM.id === 'vc7_4') {`;

const sincReplacement = `      // Reconciliación especial para Paz y Salvo Electrónico en desvinculaciones (SIGA Trámites)
      if (reqM.label === 'Paz y Salvo Electrónico' || reqM.id.includes('paz_salvo_electronico')) {
        return {
          ...reqM,
          cumplido: true,
          noAplica: true,
          obligatorio: false,
          observaciones: 'No aplica se realiza en otro sistema (SIGA Tramites)',
          fecha_cumplimiento: reqG?.fecha_cumplimiento || new Date().toISOString().split('T')[0],
          usuarioRegistro: reqG?.usuarioRegistro || 'SIGA Trámites / TH',
        };
      }

      // Reconciliación para Requisito 4 de la Fase 6 (Renuncia al cargo anterior en Ascenso)
      if (reqM.id === 'vc7_4') {`;

if (content.includes(sincTarget)) {
  content = content.replace(sincTarget, sincReplacement);
  console.log('sincronizarEtapasCaso actualizado con regla Paz y Salvo Electrónico');
} else {
  const targetCRLF = sincTarget.replace(/\n/g, '\r\n');
  const repCRLF = sincReplacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, repCRLF);
    console.log('sincronizarEtapasCaso actualizado con regla Paz y Salvo Electrónico (CRLF)');
  }
}

// 7. En sincronizarEtapasCaso, si la etapa tiene solo requisitos noAplica, estado = completed
const sincEstadoTarget = `    let estadoFinal: EstadoEtapa = etapaG.estado || etapaM.estado;
    if (todosObligatoriosCumplidos && requisitosSincronizados.length > 0) {
      estadoFinal = 'completed';
    } else if (algunCumplido) {
      estadoFinal = 'in_progress';
    } else {
      estadoFinal = 'pending';
    }`;

const sincEstadoReplacement = `    let estadoFinal: EstadoEtapa = etapaG.estado || etapaM.estado;
    if (requisitosSincronizados.length > 0 && requisitosSincronizados.every((r) => r.noAplica)) {
      estadoFinal = 'completed';
    } else if (todosObligatoriosCumplidos && requisitosSincronizados.length > 0) {
      estadoFinal = 'completed';
    } else if (algunCumplido) {
      estadoFinal = 'in_progress';
    } else {
      estadoFinal = 'pending';
    }`;

if (content.includes(sincEstadoTarget)) {
  content = content.replace(sincEstadoTarget, sincEstadoReplacement);
  console.log('sincronizarEtapasCaso actualizado para estado completed en noAplica');
} else {
  const targetCRLF = sincEstadoTarget.replace(/\n/g, '\r\n');
  const repCRLF = sincEstadoReplacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, repCRLF);
    console.log('sincronizarEtapasCaso actualizado para estado completed en noAplica (CRLF)');
  }
}

// 8. Actualizar Pestaña tabActiva === 'paz_salvo' para indicar que se gestiona en SIGA Trámites
const tabPazSalvoTarget = `                <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '700' }}>
                  Circuito Integral de Paz y Salvo Electrónico (Procedimiento PR-074)
                </Text>
                <Text style={{ color: THEME.slate600, fontSize: 12.5, lineHeight: 18 }}>
                  La desvinculación formal requiere la validación simultánea de las 4 áreas
                  responsables antes de la liquidación definitiva de prestaciones sociales:
                </Text>`;

const tabPazSalvoReplacement = `                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ color: THEME.slate900, fontSize: 16, fontWeight: '700' }}>
                    Circuito Integral de Paz y Salvo Electrónico (SIGA Trámites)
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#EEF2FF',
                      borderColor: '#C7D2FE',
                      borderWidth: 1,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#4338CA' }}>
                      Se realiza en SIGA Trámites (No aplica gestión manual)
                    </Text>
                  </View>
                </View>

                {/* Banner Oficial SIGA Trámites */}
                <View
                  style={{
                    backgroundColor: '#F0FDF4',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#BBF7D0',
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>
                      Trámite Centralizado en el Sistema Oficial SIGA Trámites
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#14532D', lineHeight: 18 }}>
                    El circuito de paz y salvo institucional (TIC, Almacén, Archivo y Talento Humano) se tramita directamente en el sistema <Text style={{ fontWeight: '700' }}>SIGA Trámites</Text>. En este módulo queda marcado automáticamente como <Text style={{ fontWeight: '700' }}>No Aplica (se realiza en otro sistema - SIGA Trámites)</Text> para evitar reprocesos y garantizar la interoperabilidad distrital.
                  </Text>
                </View>

                <Text style={{ color: THEME.slate600, fontSize: 12.5, lineHeight: 18 }}>
                  Componentes gestionados de forma autónoma en el sistema SIGA Trámites:
                </Text>`;

if (content.includes(tabPazSalvoTarget)) {
  content = content.replace(tabPazSalvoTarget, tabPazSalvoReplacement);
  console.log('Pestaña paz_salvo banner actualizada');
} else {
  const targetCRLF = tabPazSalvoTarget.replace(/\n/g, '\r\n');
  const repCRLF = tabPazSalvoReplacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, repCRLF);
    console.log('Pestaña paz_salvo banner actualizada (CRLF)');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Operación completada exitosamente.');
