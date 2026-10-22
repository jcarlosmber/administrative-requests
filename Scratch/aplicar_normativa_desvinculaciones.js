const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../frontend/app/rrhh/vinculaciones-desvinculaciones.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('Total length before:', code.length);

// 1. Agregar Formato FT-079 a LISTA_FORMATOS_OFICIALES
const formatoFT079 = `  {
    id: 'FT-079',
    codigo: '2310460-FT-079',
    nombre: 'Formato de Bienes y Rentas (Circular N° 1 de 2016 SJD)',
    version: 'Versión 02',
    archivo: '2310460-FT-079_Bienes_y_Rentas_V02.docx',
    tipo: 'DOCX',
    proceso: 'DESVINCULACION',
    fasesRecomendadas: ['Formatos Entrega de Cargo', 'Cierre y Liquidación'],
    descripcion: 'Formato oficial de actualización y declaración juramentada de bienes y rentas (Ley 190/1995, Dec. 736/1996 y Circular 1 de 2016 SJD). Plazo anual al último día de marzo, reporte de cambios en 2 meses y obligatorio al retiro.',
    requisitosAsociados: ['dc4_3', 'dp4_3', 'dl3_byr'],
  },
`;

if (!code.includes('2310460-FT-079')) {
  const targetPos = "export const LISTA_FORMATOS_OFICIALES: FormatoInstitucionalOficial[] = [";
  code = code.replace(targetPos, targetPos + '\n' + formatoFT079);
  console.log('✅ Formato FT-079 agregado a LISTA_FORMATOS_OFICIALES');
}

// 2. Agregar causales 1.13 y 1.14 a CAUSALES_RETIRO_POR_MODALIDAD
const viejaCausalRenuncia = "'Renuncia libre y regularmente aceptada (Ley 909 de 2004, Art. 41 lit. d)',";
const nuevaCausalRenunciaYVacancia = `'1.13. Vacancia temporal por nombramiento en periodo de prueba en otra entidad pública (antelación ≥ 5 días hábiles a DGC • Dec. 1083/2015)',
    '1.14. Retiro del servicio por renuncia regularmente aceptada (Ley 909/2004 Art. 41 lit. d • aceptación hasta 30 días, entrega cargo, paz y salvo y deducción créditos)',`;

if (!code.includes('1.13. Vacancia temporal por nombramiento en periodo de prueba')) {
  // Reemplazar la primera ocurrencia en ASCENSO y la segunda en CARRERA_ADMINISTRATIVA
  code = code.replace(viejaCausalRenuncia, nuevaCausalRenunciaYVacancia);
  code = code.replace(viejaCausalRenuncia, nuevaCausalRenunciaYVacancia);
  console.log('✅ Causales 1.13 y 1.14 añadidas a CAUSALES_RETIRO_POR_MODALIDAD');
}

// 3. Añadir a CAUSALES_FILTRO_DESVINCULACION
const filtroCausalesTarget = "  { key: 'TODAS', label: 'Todas las Causales' },";
const nuevoFiltro = `  { key: 'TODAS', label: 'Todas las Causales' },
  { key: 'periodo de prueba en otra entidad', label: '1.13 Vacancia temporal (Prueba en otra entidad)' },
  { key: '1.14', label: '1.14 Retiro del servicio (Renuncia)' },`;

if (!code.includes("label: '1.13 Vacancia temporal")) {
  code = code.replace(filtroCausalesTarget, nuevoFiltro);
  console.log('✅ Filtro de causales actualizado con 1.13 y 1.14');
}

// 4. Agregar estados para el Modal de Normativa de Desvinculaciones
const markerState = "const [modalFormatosVisible, setModalFormatosVisible] = useState(false);";
const nuevosEstados = `const [modalFormatosVisible, setModalFormatosVisible] = useState(false);
  const [modalNormativaDesvinculacionVisible, setModalNormativaDesvinculacionVisible] = useState(false);
  const [tabNormativaDesv, setTabNormativaDesv] = useState<'vacancia_temporal' | 'retiro_servicio' | 'bienes_rentas'>('vacancia_temporal');`;

if (!code.includes('modalNormativaDesvinculacionVisible')) {
  code = code.replace(markerState, nuevosEstados);
  console.log('✅ Estados para Modal de Normativa de Desvinculaciones creados');
}

// 5. Agregar botón en la barra superior cuando tabActiva === 'desvinculaciones'
const targetBotonTopBar = `{tabActiva === 'ingresos' && (
                <Pressable
                  onPress={() => setModalGuiaModalidadesVisible(true)}`;

const nuevoBotonTopBar = `{tabActiva === 'desvinculaciones' && (
                <Pressable
                  onPress={() => setModalNormativaDesvinculacionVisible(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    backgroundColor: pressed
                      ? 'rgba(255, 255, 255, 0.18)'
                      : 'rgba(255, 255, 255, 0.1)',
                  })}
                >
                  <Ionicons name="document-text-outline" size={15} color={THEME.white} />
                  <Text style={{ color: THEME.white, fontSize: 12, fontWeight: '600' }}>
                    ⚖️ Normativa de Retiro & Desvinculación
                  </Text>
                </Pressable>
              )}
              {tabActiva === 'ingresos' && (
                <Pressable
                  onPress={() => setModalGuiaModalidadesVisible(true)}`;

if (!code.includes('⚖️ Normativa de Retiro & Desvinculación')) {
  code = code.replace(targetBotonTopBar, nuevoBotonTopBar);
  console.log('✅ Botón de Normativa de Retiro & Desvinculación agregado a la barra superior');
}

// 6. Agregar Banner Normativo en tabActiva === 'desvinculaciones'
const targetInicioTab = `          {(tabActiva === 'ingresos' || tabActiva === 'desvinculaciones') && (
            <View style={{ gap: 18, width: '100%' }}>`;

const nuevoBannerNormativo = `          {(tabActiva === 'ingresos' || tabActiva === 'desvinculaciones') && (
            <View style={{ gap: 18, width: '100%' }}>
              {/* Banner Oficial de Normativa en Desvinculaciones (Numerales 1.13, 1.14 y Circular 1 de 2016 SJD) */}
              {tabActiva === 'desvinculaciones' && (
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#FECDD3',
                    borderLeftWidth: 5,
                    borderLeftColor: '#E11D48',
                    padding: 16,
                    gap: 12,
                    shadowColor: '#BE123C',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFE4E6', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="shield-checkmark" size={20} color="#BE123C" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#881337', letterSpacing: 0.3 }}>
                          Normativa Oficial de Desvinculaciones y Retiro del Servicio (SJD)
                        </Text>
                        <Text style={{ fontSize: 11.5, color: '#4C0519', marginTop: 1 }}>
                          Lineamientos obligatorios de Gestión del Talento Humano conforme a Circular 1 de 2016 y Formato 2310460-FT-079 V02
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setModalNormativaDesvinculacionVisible(true)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: pressed ? '#E11D48' : '#BE123C',
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 7,
                      })}
                    >
                      <Ionicons name="book-outline" size={14} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                        Ver Artículos Completos
                      </Text>
                    </Pressable>
                  </View>

                  {/* 3 Tarjetas Resumen de Normativa */}
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                    {/* Tarjeta 1.13 */}
                    <Pressable
                      onPress={() => {
                        setTabNormativaDesv('vacancia_temporal');
                        setModalNormativaDesvinculacionVisible(true);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#FFF1F2',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FFE4E6',
                        padding: 12,
                        gap: 5,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ backgroundColor: '#BE123C', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>NUMERAL 1.13</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9F1239' }} numberOfLines={1}>
                          Vacancia Temporal (Período de Prueba)
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#4C0519', lineHeight: 15 }}>
                        Memorando a la DGC con antelación no menor a cinco (5) días hábiles + copia del acto que nombra en prueba.
                      </Text>
                    </Pressable>

                    {/* Tarjeta 1.14 */}
                    <Pressable
                      onPress={() => {
                        setTabNormativaDesv('retiro_servicio');
                        setModalNormativaDesvinculacionVisible(true);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#FFF1F2',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FFE4E6',
                        padding: 12,
                        gap: 5,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ backgroundColor: '#BE123C', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>NUMERAL 1.14</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9F1239' }} numberOfLines={1}>
                          Retiro del Servicio (Renuncia & Créditos)
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#4C0519', lineHeight: 15 }}>
                        Aceptación hasta 30 días, entrega formal de puesto, paz y salvo y liquidación con abono a acreedores y saldo a cuenta.
                      </Text>
                    </Pressable>

                    {/* Tarjeta o. Bienes y Rentas */}
                    <Pressable
                      onPress={() => {
                        setTabNormativaDesv('bienes_rentas');
                        setModalNormativaDesvinculacionVisible(true);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#FFF1F2',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FFE4E6',
                        padding: 12,
                        gap: 5,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ backgroundColor: '#BE123C', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1.5 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>NUMERAL o</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9F1239' }} numberOfLines={1}>
                          Formato de Bienes y Rentas (FT-079)
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#4C0519', lineHeight: 15 }}>
                        Circular 1/2016 SJD, Ley 190/1995 y Dec. 736/1996. Plazo anual último día de marzo, cambios en 2 meses y al retiro.
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}`;

if (!code.includes('Banner Oficial de Normativa en Desvinculaciones')) {
  code = code.replace(targetInicioTab, nuevoBannerNormativo);
  console.log('✅ Banner Normativo agregado en la vista de Desvinculaciones');
}

// 7. Enriquecer los Presets Normativos de Desvinculación
const targetPresetsDesv = `      // 5. DESVINCULACIONES
      d_renun_1: {`;

const nuevosPresetsDesv = `      // 5. DESVINCULACIONES
      d_carr_1: {
        subtitulo: 'Soporte y causal legal de retiro o separación temporal (Numerales 1.13 y 1.14 SJD)',
        directrices: [
          {
            titulo: 'NUMERAL 1.13: VACANCIA TEMPORAL',
            descripcion: 'Nombramiento en periodo de prueba en otra entidad pública: informar a la Dirección de Gestión Corporativa mediante memorando con antelación no menor a cinco (5) días hábiles, anexando copia del acto.',
          },
          {
            titulo: 'NUMERAL 1.14: RETIRO DEL SERVICIO',
            descripcion: 'Renuncia irrevocable no motivada radicada por memorando al nominador. Fecha de retiro concedida hasta 30 días siguientes; vencidos, opera separación sin abandono del cargo.',
          },
          {
            titulo: 'LEY 909 / DECRETO 1083',
            descripcion: 'Causales taxativas objetivas de retiro de carrera y verificación obligatoria de inclusión en nómina de pensionados o resolución motivada.',
          },
        ],
      },
      d_carr_4: {
        subtitulo: 'Entrega de cargo, paz y salvo y actualización obligatoria de Bienes y Rentas (Circular 1/2016)',
        directrices: [
          {
            titulo: 'CIRCULAR N° 1 DE 2016 SJD',
            descripcion: 'Formulario Único de Bienes y Rentas (2310460-FT-079 V02): actualización anual a más tardar el último día de marzo, reporte de cambios en 2 meses y obligatorio al retiro.',
          },
          {
            titulo: 'ENTREGA DE CARGO (FT-436)',
            descripcion: 'El servidor saliente debe hacer entrega formal del cargo y tramitar paz y salvo con las dependencias de la Entidad (Numeral 1.14).',
          },
          {
            titulo: 'ACTA DE GESTIÓN (LEY 951)',
            descripcion: 'Suscripción obligatoria del acta circunstanciada de informe de gestión y entrega del cargo con remisión a Control Interno.',
          },
        ],
      },
      d_carr_6: {
        subtitulo: 'Liquidación de prestaciones y retención de créditos de nómina a acreedores (Numeral 1.14)',
        directrices: [
          {
            titulo: 'NUMERAL 1.14: CRÉDITOS Y LIBRANZAS',
            descripcion: 'Si tiene créditos con descuento de nómina, del valor de la liquidación se consignará a las entidades acreedoras la proporción adeudada; el saldo a favor a la cuenta bancaria.',
          },
          {
            titulo: 'DEC. LEY 1045 / DEC. 514',
            descripcion: 'Liquidación técnica de factores salariales: días laborados, primas legales, cesantías y compensación en dinero de vacaciones causadas.',
          },
          {
            titulo: 'ORDENACIÓN DEL PAGO BOGDATA',
            descripcion: 'Resolución suscrita por Director(a) de Gestión Corporativa y dispersión de recursos por Tesorería Distrital.',
          },
        ],
      },
      d_renun_1: {`;

if (!code.includes('d_carr_1: {')) {
  code = code.replace(targetPresetsDesv, nuevosPresetsDesv);
  console.log('✅ Presets normativos enriquecidos para d_carr_1, d_carr_4 y d_carr_6');
}

// 8. Enriquecer etapa d_carr_1 con los requisitos específicos de 1.13 y 1.14
const targetReqDc1 = `              {
                id: 'dc1_1',
                label: 'Recepción del documento soporte de retiro de carrera (Formato 2311520-FT-018)',`;

const nuevoReqDc1 = `              {
                id: 'dc1_vacancia_113',
                label: '1.13. Vacancia temporal por periodo de prueba en otra entidad (Memorando antelación ≥ 5 días hábiles)',
                cumplido: false,
                obligatorio: false,
                norma: 'Reglamento SJD Numeral 1.13 • Decreto 1083 de 2015, Art. 2.2.5.5.52',
                notaNormativa: 'El servidor nombrado en periodo de prueba en otra entidad pública, luego de superar las etapas de un concurso de méritos, deberá informarlo a la Dirección de Gestión Corporativa mediante memorando con antelación no menor a cinco (5) días hábiles, anexando copia del acto que lo nombra en periodo de prueba.',
                textoNormativo: 'El servidor nombrado en periodo de prueba en otra entidad pública, luego de superar las etapas de un concurso de méritos, deberá informarlo a la Dirección de Gestión Corporativa mediante memorando con antelación no menor a cinco (5) días hábiles, anexando copia del acto que lo nombra en periodo de prueba.',
                detalleProcedimiento: 'Radicar memorando ante la Dirección de Gestión Corporativa con mínimo cinco (5) días hábiles de anticipación al inicio del período de prueba en la otra entidad pública, adjuntando copia del acto administrativo de nombramiento.',
                posiblesEvidencias: [
                  'Memorando radicado en correspondencia oficial dirigido a la Dirección de Gestión Corporativa con antelación ≥ 5 días hábiles.',
                  'Copia del acto administrativo de nombramiento en periodo de prueba expedido por la otra entidad pública.',
                ],
              },
              {
                id: 'dc1_1',
                label: '1.14. Recepción del documento soporte de renuncia / retiro (Formato 2311520-FT-018)',`;

if (!code.includes('dc1_vacancia_113')) {
  code = code.replace(targetReqDc1, nuevoReqDc1);
  console.log('✅ Requisito de Vacancia Temporal 1.13 añadido a d_carr_1');
}

// 9. Enriquecer texto de renuncia en dc1_1 con numeral 1.14
const targetTextoDc1 = `                textoNormativo: 'Ley 909 de 2004, artículo 41: El retiro del servicio de quienes estén desempeñando empleos de libre nombramiento y remoción y de carrera administrativa se produce por las causales consagradas taxativamente en la ley.',`;
const nuevoTextoDc1 = `                textoNormativo: 'Numeral 1.14 SJD: Renuncia. El servidor puede presentar renuncia irrevocable no motivada en cualquier tiempo, por escrito, radicada mediante memorando dirigido a la autoridad nominadora. La fecha de retiro podrá concederse hasta treinta (30) días siguientes a su presentación; cumplido este plazo, el empleado podrá separarse del cargo sin incurrir en abandono del cargo. El servidor debe hacer entrega formal del cargo y diligenciar el paz y salvo con las dependencias de la Entidad.',`;

if (!code.includes('Numeral 1.14 SJD: Renuncia')) {
  code = code.replace(targetTextoDc1, nuevoTextoDc1);
  console.log('✅ Texto normativo de Renuncia 1.14 actualizado');
}

// 10. Enriquecer dc4_3 con Circular 1 de 2016 y Formato 2310460-FT-079 Versión 02
const targetDc43 = `              {
                id: 'dc4_3',
                label: 'SIDEAP: Declaración Juramentada de Bienes y Rentas. (Novedad retiro)',
                cumplido: false,
                obligatorio: true,
                norma: 'Ley 2013 de 2019, Arts. 2 y 3 • Decreto 830 de 2021 • SIDEAP Distrital',
                textoNormativo: 'Los servidores públicos deben publicar y actualizar en el SIDEAP su declaración jurada de bienes y rentas al momento de su retiro del servicio (novedad retiro).',`;

const nuevoDc43 = `              {
                id: 'dc4_3',
                label: 'o. Formato de Bienes y Rentas (Formato 2310460-FT-079 V02 • Circular 1/2016 SJD • Novedad Retiro)',
                cumplido: false,
                obligatorio: true,
                codigoFormato: '2310460-FT-079',
                norma: 'Circular N° 1 de 2016 SJD • Ley 190 de 1995 • Decreto 736 de 1996 • Formato 2310460-FT-079 Versión 02 • SIDEAP',
                notaNormativa: 'Numeral o. De conformidad con la Ley 190 de 1995 y el Decreto 736 de 1996, la información del Formulario Único de Bienes y Rentas debe actualizarse a más tardar el último día del mes de marzo de cada anualidad. Todo cambio relacionado con la declaración de bienes y rentas debe ser comunicado por el funcionario a la Entidad, mediante la actualización del formato correspondiente, dentro de los dos (2) meses siguientes a su ocurrencia.',
                textoNormativo: 'De conformidad con la Ley 190 de 1995 y el Decreto 736 de 1996, la información del Formulario Único de Bienes y Rentas debe actualizarse a más tardar el último día del mes de marzo de cada anualidad. Todo cambio relacionado con la declaración de bienes y rentas debe ser comunicado por el funcionario a la Entidad, mediante la actualización del formato correspondiente, dentro de los dos (2) meses siguientes a su ocurrencia. Al retiro del servicio es indispensable radicar la declaración actualizada con opción Novedad Retiro.',`;

if (!code.includes('2310460-FT-079 V02 • Circular 1/2016 SJD')) {
  code = code.replace(targetDc43, nuevoDc43);
  console.log('✅ Requisito dc4_3 enriquecido con Circular 1 de 2016 y Formato FT-079');
}

// 11. Enriquecer dc6_2_nom con la regla de créditos y libranzas de 1.14
const targetDc62 = `              {
                id: 'dc6_2_nom',
                label: 'Liquidación técnica de prestaciones sociales de carrera (Dec. Ley 1045/1978)',
                cumplido: false,
                obligatorio: true,
                norma: 'Decreto Ley 1045 de 1978 • Decreto Distrital 514 de 2006',
                detalleProcedimiento: 'Liquidar días laborados del mes, prima de servicios, prima de navidad, cesantías consolidadas y vacaciones compensadas en dinero.',`;

const nuevoDc62 = `              {
                id: 'dc6_2_nom',
                label: 'Liquidación técnica y compensación de créditos de nómina (Numeral 1.14 SJD)',
                cumplido: false,
                obligatorio: true,
                norma: 'Reglamento SJD Numeral 1.14 • Decreto Ley 1045 de 1978 • Decreto Distrital 514 de 2006',
                notaNormativa: 'Numeral 1.14: Si el servidor tiene créditos con descuento de nómina, del valor de la liquidación se consignará a las entidades acreedoras la proporción adeudada, previos los descuentos autorizados y de ley; el saldo a favor se consignará en la cuenta bancaria registrada por el servidor.',
                textoNormativo: 'Si tiene créditos con descuento de nómina, del valor de la liquidación se consignará a las entidades acreedoras la proporción adeudada, previos los descuentos autorizados y de ley; el saldo a favor se consignará en la cuenta bancaria registrada por el servidor.',
                detalleProcedimiento: 'Liquidar factores salariales y prestaciones sociales. Verificar cruce con nómina de créditos/libranzas activas; aplicar deducciones legales a favor de las entidades acreedoras y ordenar el giro del saldo neto a la cuenta bancaria registrada.',`;

if (!code.includes('compensación de créditos de nómina (Numeral 1.14 SJD)')) {
  code = code.replace(targetDc62, nuevoDc62);
  console.log('✅ Requisito dc6_2_nom enriquecido con deducción de créditos del Numeral 1.14');
}

// 12. Agregar el Componente Completo del Modal de Normativa de Desvinculaciones
const modalJSX = `
      {/* =================================================================== */}
      {/* MODAL INSTITUCIONAL: NORMATIVA OFICIAL DE RETIRO & DESVINCULACIÓN   */}
      {/* (Numerales 1.13, 1.14 y Circular 1 de 2016 SJD / Formato FT-079)     */}
      {/* =================================================================== */}
      <Modal
        visible={modalNormativaDesvinculacionVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalNormativaDesvinculacionVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isTablet ? 24 : 12,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 920,
              maxHeight: '92%',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header del Modal */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 22,
                paddingVertical: 16,
                backgroundColor: '#881337',
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                  }}
                >
                  <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                    Normativa Oficial de Desvinculaciones y Retiro del Servicio
                  </Text>
                  <Text style={{ color: '#FECDD3', fontSize: 12, marginTop: 1 }}>
                    Secretaría Jurídica Distrital • Alcaldía Mayor de Bogotá D.C.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setModalNormativaDesvinculacionVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Pestañas de los 3 Artículos Normativos */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#F1F5F9',
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
                paddingHorizontal: 12,
                paddingTop: 8,
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              {[
                { id: 'vacancia_temporal' as const, label: '1.13. Vacancia Temporal (Período Prueba)', icon: 'time-outline' },
                { id: 'retiro_servicio' as const, label: '1.14. Retiro del Servicio (Renuncia)', icon: 'exit-outline' },
                { id: 'bienes_rentas' as const, label: 'o. Formato Bienes y Rentas (FT-079)', icon: 'document-text-outline' },
              ].map((tab) => {
                const activo = tabNormativaDesv === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setTabNormativaDesv(tab.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderBottomWidth: 2,
                      borderBottomColor: activo ? '#BE123C' : 'transparent',
                      backgroundColor: activo ? '#FFFFFF' : 'transparent',
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                    }}
                  >
                    <Ionicons name={tab.icon as any} size={15} color={activo ? '#BE123C' : '#64748B'} />
                    <Text style={{ fontSize: 12.5, fontWeight: activo ? '700' : '500', color: activo ? '#BE123C' : '#475569' }}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Contenido con Scroll */}
            <ScrollView style={{ flex: 1, padding: 22 }} contentContainerStyle={{ gap: 16 }}>
              {/* TAB 1: 1.13. VACANCIA TEMPORAL */}
              {tabNormativaDesv === 'vacancia_temporal' && (
                <View style={{ gap: 16 }}>
                  <View
                    style={{
                      backgroundColor: '#ECFDF5',
                      borderWidth: 1,
                      borderColor: '#A7F3D0',
                      borderRadius: 10,
                      padding: 14,
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Ionicons name="information-circle" size={22} color="#059669" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46' }}>
                        1.13. VACANCIA TEMPORAL POR NOMBRAMIENTO EN PERIODO DE PRUEBA EN OTRA ENTIDAD
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#047857', marginTop: 2 }}>
                        Reglamento Interno SJD • Decreto 1083 de 2015, Art. 2.2.5.5.52 • Ley 909 de 2004
                      </Text>
                    </View>
                  </View>

                  {/* Texto Oficial */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      padding: 18,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Texto Normativo Oficial:
                    </Text>
                    <Text style={{ fontSize: 14, color: '#1E293B', lineHeight: 22, fontStyle: 'italic', fontWeight: '500' }}>
                      «El servidor nombrado en periodo de prueba en otra entidad pública, luego de superar las etapas de un concurso de méritos, deberá informarlo a la Dirección de Gestión Corporativa mediante memorando con antelación no menor a cinco (5) días hábiles, anexando copia del acto que lo nombra en periodo de prueba.»
                    </Text>
                  </View>

                  {/* Desglose de Obligaciones y Términos */}
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      Puntos Clave y Directrices para Talento Humano:
                    </Text>

                    <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="calendar-outline" size={16} color="#0284C7" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>Plazo Perentorio</Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          Antelación no menor a cinco (5) días hábiles antes de posesionarse en la otra entidad pública.
                        </Text>
                      </View>

                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="mail-outline" size={16} color="#0284C7" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>Canal Oficial</Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          Radicación formal de memorando dirigido a la Dirección de Gestión Corporativa.
                        </Text>
                      </View>

                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="document-attach-outline" size={16} color="#0284C7" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>Anexo Obligatorio</Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          Copia íntegra del acto administrativo de nombramiento en periodo de prueba tras superar concurso de méritos.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 2: 1.14. RETIRO DEL SERVICIO */}
              {tabNormativaDesv === 'retiro_servicio' && (
                <View style={{ gap: 16 }}>
                  <View
                    style={{
                      backgroundColor: '#FFF1F2',
                      borderWidth: 1,
                      borderColor: '#FECDD3',
                      borderRadius: 10,
                      padding: 14,
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Ionicons name="exit" size={22} color="#BE123C" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#881337' }}>
                        1.14. RETIRO DEL SERVICIO — RENUNCIA & LIQUIDACIÓN DE CRÉDITOS
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#9F1239', marginTop: 2 }}>
                        Reglamento Interno SJD • Ley 909 de 2004, Art. 41 lit. d • Decreto 1083 de 2015, Art. 2.2.11.1.1
                      </Text>
                    </View>
                  </View>

                  {/* Texto Oficial */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      padding: 18,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Texto Normativo Oficial:
                    </Text>
                    <Text style={{ fontSize: 14, color: '#1E293B', lineHeight: 22, fontStyle: 'italic', fontWeight: '500' }}>
                      «Renuncia. El servidor puede presentar renuncia irrevocable no motivada en cualquier tiempo, por escrito, radicada mediante memorando dirigido a la autoridad nominadora. La fecha de retiro podrá concederse hasta treinta (30) días siguientes a su presentación; cumplido este plazo, el empleado podrá separarse del cargo sin incurrir en abandono del cargo. El servidor debe hacer entrega formal del cargo y diligenciar el paz y salvo con las dependencias de la Entidad. Si tiene créditos con descuento de nómina, del valor de la liquidación se consignará a las entidades acreedoras la proporción adeudada, previos los descuentos autorizados y de ley; el saldo a favor se consignará en la cuenta bancaria registrada por el servidor.»
                    </Text>
                  </View>

                  {/* 4 Pilares del Numeral 1.14 */}
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      Procedimiento Secuencial y Efectos Jurídicos:
                    </Text>

                    <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#BE123C' }}>1. Presentación Libre</Text>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          Escrito radicado por memorando al nominador, irrevocable y no motivada en cualquier momento.
                        </Text>
                      </View>

                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#BE123C' }}>2. Término de 30 Días</Text>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          Concesión hasta 30 días siguientes. Vencido el plazo, puede separarse sin incurrir en abandono de cargo.
                        </Text>
                      </View>

                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#BE123C' }}>3. Entrega y Paz y Salvo</Text>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          Entrega formal del puesto (FT-436) y circuito de paz y salvo con dependencias institucionales.
                        </Text>
                      </View>

                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#BE123C' }}>4. Compensación Créditos</Text>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          De la liquidación se abona a entidades acreedoras la proporción de créditos de nómina; saldo a cuenta bancaria.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 3: o. FORMATO DE BIENES Y RENTAS */}
              {tabNormativaDesv === 'bienes_rentas' && (
                <View style={{ gap: 16 }}>
                  <View
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      borderRadius: 10,
                      padding: 14,
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Ionicons name="document-text" size={22} color="#1D4ED8" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E3A8A' }}>
                        o. ACTUALIZACIÓN DE INFORMACIÓN — FORMATO DE BIENES Y RENTAS
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#1D4ED8', marginTop: 2 }}>
                        Circular N° 1 de 2016 de la Secretaría Jurídica Distrital • Formato 2310460-FT-079 Versión 02
                      </Text>
                    </View>
                  </View>

                  {/* Membrete Oficial y Código de Formato */}
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      padding: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>ALCALDÍA MAYOR DE BOGOTÁ D.C.</Text>
                      <Text style={{ fontSize: 10.5, color: '#64748B' }}>Secretaría Jurídica Distrital • Carrera 8 No. 10 - 65</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#059669', backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        CLASIFICACIÓN DE LA INFORMACIÓN: PÚBLICA
                      </Text>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#334155', marginTop: 2 }}>
                        2310460-FT-079 Versión 02
                      </Text>
                    </View>
                  </View>

                  {/* Texto Oficial */}
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      padding: 18,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Texto Normativo Oficial:
                    </Text>
                    <Text style={{ fontSize: 14, color: '#1E293B', lineHeight: 22, fontStyle: 'italic', fontWeight: '500' }}>
                      «De conformidad con la Ley 190 de 1995 y el Decreto 736 de 1996, la información del Formulario Único de Bienes y Rentas debe actualizarse a más tardar el último día del mes de marzo de cada anualidad. Todo cambio relacionado con la declaración de bienes y rentas debe ser comunicado por el funcionario a la Entidad, mediante la actualización del formato correspondiente, dentro de los dos (2) meses siguientes a su ocurrencia.»
                    </Text>
                  </View>

                  {/* Reglas Temporales */}
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      Obligaciones de Actualización de Bienes y Rentas:
                    </Text>

                    <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}>
                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>📅 Actualización Periódica Anual</Text>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          A más tardar el último día del mes de marzo de cada anualidad (31 de marzo).
                        </Text>
                      </View>

                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>⏱️ Cambios Patrimoniales</Text>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          Dentro de los dos (2) meses siguientes a la ocurrencia del cambio o adquisición.
                        </Text>
                      </View>

                      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>🚪 Corte al Retiro / Desvinculación</Text>
                        <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                          Declaración jurada actualizada en SIDEAP marcando la opción de novedad retiro con fecha del último día laborado.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer del Modal */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 22,
                paddingVertical: 14,
                backgroundColor: '#F8FAFC',
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 11, color: '#64748B' }}>
                Alcaldía Mayor de Bogotá D.C. • Secretaría Jurídica Distrital • Talento Humano
              </Text>

              <Pressable
                onPress={() => setModalNormativaDesvinculacionVisible(false)}
                style={{
                  backgroundColor: '#BE123C',
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderRadius: 7,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                  Entendido / Cerrar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
`;

const targetModalPlacement = `      {/* =================================================================== */}
      {/* MODAL INSTITUCIONAL: BANCO DE FORMATOS OFICIALES Y PLANTILLAS RRHH  */}`;

if (!code.includes('MODAL INSTITUCIONAL: NORMATIVA OFICIAL DE RETIRO & DESVINCULACIÓN')) {
  code = code.replace(targetModalPlacement, modalJSX + '\n' + targetModalPlacement);
  console.log('✅ Modal de Normativa de Desvinculaciones insertado en JSX');
}

// 13. Agregar en la pestaña matriz_normativa el bloque de Desvinculaciones
const targetMatrizNormativa = `                    {
                      proc: 'PR-074: Retiro de Servidores Públicos',
                      desc: 'Causales de retiro Art. 41 Ley 909/2004, circuito de paz y salvo, liquidación y reporte obligatorio en SIMO 4.0.',
                    },`;

const nuevoMatrizNormativa = `                    {
                      proc: 'PR-074: Retiro de Servidores Públicos',
                      desc: 'Causales de retiro Art. 41 Ley 909/2004, circuito de paz y salvo, liquidación y reporte obligatorio en SIMO 4.0.',
                    },
                    {
                      proc: 'Numeral 1.13: Vacancia Temporal por Período de Prueba en Otra Entidad',
                      desc: 'El servidor nombrado en prueba en otra entidad pública por mérito debe informarlo a la DGC por memorando con antelación no menor a cinco (5) días hábiles anexando copia del acto.',
                    },
                    {
                      proc: 'Numeral 1.14: Retiro del Servicio (Renuncia & Compensación de Créditos)',
                      desc: 'Renuncia irrevocable radicada por memorando; plazo hasta 30 días para separación sin abandono del cargo, entrega formal, paz y salvo y abono a entidades acreedoras de créditos de nómina.',
                    },
                    {
                      proc: 'Numeral o: Formulario Único de Bienes y Rentas (Circular 1 de 2016 SJD / FT-079 V02)',
                      desc: 'Ley 190/1995 y Decreto 736/1996. Actualización obligatoria a más tardar el último día del mes de marzo, cambios dentro de 2 meses y registro formal al momento del retiro.',
                    },`;

if (!code.includes('Numeral 1.13: Vacancia Temporal')) {
  code = code.replace(targetMatrizNormativa, nuevoMatrizNormativa);
  console.log('✅ Normativa de Desvinculaciones agregada a la pestaña Matriz Normativa');
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Total length after:', code.length);
console.log('🎉 Modificaciones aplicadas con éxito a vinculaciones-desvinculaciones.tsx');
