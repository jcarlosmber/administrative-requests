const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('../frontend/app/rrhh/vinculaciones-desvinculaciones.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Inyectar CAUSALES_ARTICULO_41_LEY_909 y actualizar CAUSALES_RETIRO_POR_MODALIDAD
const markerBeforeCausales = 'export const CAUSALES_RETIRO_POR_MODALIDAD: Record<ModalidadPersonal, string[]> = {';

const definitionArt41 = `export interface CausalArticulo41 {
  literal: string;
  texto: string;
  inexequible?: boolean;
  notaCorte?: string;
  enlaceNorma?: { texto: string; url: string };
  enlaceReglamentacion?: { texto: string; url: string };
}

export const CAUSALES_ARTICULO_41_LEY_909: CausalArticulo41[] = [
  {
    literal: 'a',
    texto: 'Por declaratoria de insubsistencia del nombramiento en los empleos de libre nombramiento y remoción;',
  },
  {
    literal: 'b',
    texto: 'Por declaratoria de insubsistencia del nombramiento, como consecuencia del resultado no satisfactorio en la evaluación del desempeño laboral de un empleado de carrera administrativa;',
  },
  {
    literal: 'c',
    texto: 'INEXEQUIBLE. Por razones de buen servicio, para los empleados de carrera administrativa, mediante resolución motivada; Sentencia C-501 de 2005.\\n(Reglamentado por el Decreto Nacional 3543 de 2004)',
    inexequible: true,
    notaCorte: 'Sentencia C-501 de 2005.',
    enlaceNorma: {
      texto: 'Sentencia C-501 de 2005',
      url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=16725#0',
    },
    enlaceReglamentacion: {
      texto: 'Reglamentado por el Decreto Nacional 3543 de 2004',
      url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=15120#3543',
    },
  },
  {
    literal: 'd',
    texto: 'Por renuncia regularmente aceptada;',
  },
  {
    literal: 'e',
    texto: 'Retiro por haber obtenido la pensión de jubilación o vejez;\\nDeclarado EXEQUIBLE por la Corte Constitucional mediante Sentencia C-501 de 2005, en el entendido de que no se pueda dar por terminada la relación laboral sin que se le notifique debidamente su inclusión en la nómina de pensionados correspondiente.',
    notaCorte: 'Declarado EXEQUIBLE por la Corte Constitucional mediante Sentencia C-501 de 2005, en el entendido de que no se pueda dar por terminada la relación laboral sin que se le notifique debidamente su inclusión en la nómina de pensionados correspondiente.',
    enlaceNorma: {
      texto: 'Sentencia C-501 de 2005',
      url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=16725#0',
    },
  },
  {
    literal: 'f',
    texto: 'Por invalidez absoluta;',
  },
  {
    literal: 'g',
    texto: 'Por edad de retiro forzoso;',
  },
  {
    literal: 'h',
    texto: 'Por destitución, como consecuencia de proceso disciplinario;',
  },
  {
    literal: 'i',
    texto: 'Por declaratoria de vacancia del empleo en el caso de abandono del mismo;\\nLiteral declarado EXEQUIBLE por la Corte Constitucional mediante Sentencia C-1189 de 2005, en el entendido que para aplicar esta causal, es requisito indispensable que se dé cumplimiento al procedimiento establecido en el inciso primero del artículo 35 del Código Contencioso Administrativo para la expedición de cualquier acto administrativo de carácter particular y concreto, esto es, que se permita al afectado el ejercicio de su derecho de defensa, previa la expedición del acto administrativo que declare el retiro del servicio.',
    notaCorte: 'Literal declarado EXEQUIBLE por la Corte Constitucional mediante Sentencia C-1189 de 2005, en el entendido que para aplicar esta causal, es requisito indispensable que se dé cumplimiento al procedimiento establecido en el inciso primero del artículo 35 del Código Contencioso Administrativo para la expedición de cualquier acto administrativo de carácter particular y concreto, esto es, que se permita al afectado el ejercicio de su derecho de defensa, previa la expedición del acto administrativo que declare el retiro del servicio.',
    enlaceNorma: {
      texto: 'Sentencia C-1189 de 2005',
      url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=18914#0',
    },
  },
  {
    literal: 'j',
    texto: 'Por revocatoria del nombramiento por no acreditar los requisitos para el desempeño del empleo, de conformidad con el artículo 5 de la Ley 190 de 1995, y las normas que lo adicionen o modifiquen;',
    enlaceNorma: {
      texto: 'Artículo 5 de la Ley 190 de 1995',
      url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=321#5',
    },
  },
  {
    literal: 'k',
    texto: 'Por orden o decisión judicial;',
  },
  {
    literal: 'l',
    texto: 'Por supresión del empleo;',
  },
  {
    literal: 'm',
    texto: 'Por muerte;',
  },
  {
    literal: 'n',
    texto: 'Por las demás que determinen la Constitución Política y las leyes.',
  },
];

export const CAUSALES_RETIRO_POR_MODALIDAD: Record<ModalidadPersonal, string[]> = {`;

if (!content.includes('CAUSALES_ARTICULO_41_LEY_909')) {
  content = content.replace(markerBeforeCausales, definitionArt41);
  console.log('Insertada constante CAUSALES_ARTICULO_41_LEY_909');
}

// 2. Inyectar estado mostrarDetalleArt41 en el componente
const markerState = "const [causalInput, setCausalInput] = useState(CAUSALES_RETIRO[0]);";
const stateToAdd = `const [causalInput, setCausalInput] = useState(CAUSALES_RETIRO[0]);
  const [mostrarDetalleArt41, setMostrarDetalleArt41] = useState(true);
  const [modalArticulo41Visible, setModalArticulo41Visible] = useState(false);`;

if (!content.includes('mostrarDetalleArt41')) {
  content = content.replace(markerState, stateToAdd);
  console.log('Insertado estado mostrarDetalleArt41');
}

// 3. Reemplazar el bloque de causal en el modal de desvinculación
const oldModalBlockRegex = /\{\/\* Causal de Retiro \(Solo si es DESVINCULACIÓN\) \*\/\}[\s\S]*?\{nuevoTipoProceso === 'DESVINCULACION' && \([\s\S]*?<\/View>\s*<\/View>\s*\)\}/;

const newModalBlock = `{/* Causal de Retiro (Solo si es DESVINCULACIÓN) */}
                  {nuevoTipoProceso === 'DESVINCULACION' && (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: THEME.slate900, fontSize: 12, fontWeight: '800' }}>
                          Causal Normativa de Retiro (Ley 909 de 2004, Art. 41) *
                        </Text>
                        <Pressable
                          onPress={() => setMostrarDetalleArt41(!mostrarDetalleArt41)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, backgroundColor: THEME.slate100 }}
                        >
                          <Ionicons name={mostrarDetalleArt41 ? "chevron-up" : "chevron-down"} size={14} color={THEME.marca700} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.marca700 }}>
                            {mostrarDetalleArt41 ? "Ocultar Artículo 41" : "Ver Artículo 41 Completo"}
                          </Text>
                        </Pressable>
                      </View>

                      {/* Caja con la Causal Seleccionada Actualmente */}
                      <View style={{ backgroundColor: THEME.marca50, borderRadius: 8, borderWidth: 1.5, borderColor: THEME.marca600, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="checkmark-circle" size={18} color={THEME.marca700} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.marca800, textTransform: 'uppercase' }}>
                            Causal Seleccionada para el Trámite:
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.slate900, marginTop: 1 }}>
                            {causalInput || 'Seleccione una causal del Artículo 41'}
                          </Text>
                        </View>
                      </View>

                      {/* COMPONENTE COMPLETO DEL ARTÍCULO 41 (Ley 909 de 2004) */}
                      {mostrarDetalleArt41 && (
                        <View
                          style={{
                            backgroundColor: THEME.white,
                            borderRadius: 10,
                            borderWidth: 1.5,
                            borderColor: THEME.slate300,
                            padding: 12,
                            maxHeight: 280,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 3,
                          }}
                        >
                          <View style={{ borderBottomWidth: 1, borderBottomColor: THEME.slate200, paddingBottom: 8, marginBottom: 8 }}>
                            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.slate900 }}>
                              ARTÍCULO 41. Causales de retiro del servicio.
                            </Text>
                            <Text style={{ fontSize: 11, color: THEME.slate600, marginTop: 2, fontStyle: 'italic' }}>
                              El retiro del servicio de quienes estén desempeñando empleos de libre nombramiento y remoción y de carrera administrativa se produce en los siguientes casos:
                            </Text>
                          </View>

                          <ScrollView nestedScrollEnabled={true} style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                            <View style={{ gap: 8, paddingRight: 4 }}>
                              {CAUSALES_ARTICULO_41_LEY_909.map((item) => {
                                const seleccionada = causalInput.includes(\`lit. \${item.literal}\`) || causalInput.startsWith(\`\${item.literal})\`) || causalInput === item.texto;
                                return (
                                  <View
                                    key={item.literal}
                                    style={{
                                      backgroundColor: item.inexequible ? '#FFF1F2' : seleccionada ? THEME.marca50 : THEME.slate50,
                                      borderWidth: 1,
                                      borderColor: item.inexequible ? '#FDA4AF' : seleccionada ? THEME.marca600 : THEME.slate200,
                                      borderRadius: 8,
                                      padding: 9,
                                      gap: 4,
                                    }}
                                  >
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                      <View
                                        style={{
                                          width: 22,
                                          height: 22,
                                          borderRadius: 11,
                                          backgroundColor: item.inexequible ? '#BE123C' : seleccionada ? THEME.marca700 : THEME.slate200,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          marginTop: 1,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 11,
                                            fontWeight: '800',
                                            color: item.inexequible || seleccionada ? THEME.white : THEME.slate700,
                                          }}
                                        >
                                          {item.literal}
                                        </Text>
                                      </View>

                                      <View style={{ flex: 1 }}>
                                        <Text
                                          style={{
                                            fontSize: 11.5,
                                            fontWeight: seleccionada ? '700' : '500',
                                            color: item.inexequible ? '#9F1239' : THEME.slate900,
                                            lineHeight: 16,
                                          }}
                                        >
                                          {item.literal}) {item.texto}
                                        </Text>

                                        {/* Badges y Notas de la Corte Constitucional */}
                                        {item.inexequible && (
                                          <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                            <View style={{ backgroundColor: '#FEE2E2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#BE123C' }}>
                                                INEXEQUIBLE • NO APLICABLE
                                              </Text>
                                            </View>
                                            {item.enlaceNorma && (
                                              <Pressable
                                                onPress={() => Linking.openURL(item.enlaceNorma.url)}
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                                              >
                                                <Text style={{ fontSize: 10, color: '#0369A1', textDecorationLine: 'underline', fontWeight: '600' }}>
                                                  {item.enlaceNorma.texto}
                                                </Text>
                                                <Ionicons name="open-outline" size={11} color="#0369A1" />
                                              </Pressable>
                                            )}
                                            {item.enlaceReglamentacion && (
                                              <Pressable
                                                onPress={() => Linking.openURL(item.enlaceReglamentacion.url)}
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                                              >
                                                <Text style={{ fontSize: 10, color: '#0369A1', textDecorationLine: 'underline', fontWeight: '600' }}>
                                                  ({item.enlaceReglamentacion.texto})
                                                </Text>
                                                <Ionicons name="open-outline" size={11} color="#0369A1" />
                                              </Pressable>
                                            )}
                                          </View>
                                        )}

                                        {item.notaCorte && !item.inexequible && (
                                          <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#92400E' }}>
                                                CONDICIONADO POR LA CORTE
                                              </Text>
                                            </View>
                                            {item.enlaceNorma && (
                                              <Pressable
                                                onPress={() => Linking.openURL(item.enlaceNorma.url)}
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                                              >
                                                <Text style={{ fontSize: 10, color: '#0369A1', textDecorationLine: 'underline', fontWeight: '600' }}>
                                                  {item.enlaceNorma.texto}
                                                </Text>
                                                <Ionicons name="open-outline" size={11} color="#0369A1" />
                                              </Pressable>
                                            )}
                                          </View>
                                        )}

                                        {item.enlaceNorma && !item.notaCorte && !item.inexequible && (
                                          <View style={{ marginTop: 4 }}>
                                            <Pressable
                                              onPress={() => Linking.openURL(item.enlaceNorma.url)}
                                              style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                                            >
                                              <Text style={{ fontSize: 10, color: '#0369A1', textDecorationLine: 'underline', fontWeight: '600' }}>
                                                Consultar {item.enlaceNorma.texto}
                                              </Text>
                                              <Ionicons name="open-outline" size={11} color="#0369A1" />
                                            </Pressable>
                                          </View>
                                        )}
                                      </View>

                                      {/* Botón Seleccionar Causal */}
                                      {!item.inexequible && (
                                        <Pressable
                                          onPress={() => setCausalInput(\`Art. 41 lit. \${item.literal}) \${item.texto.split(';')[0].replace(/\\n.*/g, '')}\`)}
                                          style={{
                                            paddingVertical: 3,
                                            paddingHorizontal: 8,
                                            borderRadius: 4,
                                            backgroundColor: seleccionada ? THEME.marca600 : THEME.white,
                                            borderWidth: 1,
                                            borderColor: seleccionada ? THEME.marca700 : THEME.slate300,
                                          }}
                                        >
                                          <Text style={{ fontSize: 10, fontWeight: '700', color: seleccionada ? THEME.white : THEME.slate700 }}>
                                            {seleccionada ? 'Activa' : 'Elegir'}
                                          </Text>
                                        </Pressable>
                                      )}
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}`;

if (content.match(oldModalBlockRegex)) {
  content = content.replace(oldModalBlockRegex, newModalBlock);
  console.log('Reemplazado bloque de causal en modal con ARTÍCULO 41 completo');
} else {
  console.error('No se pudo encontrar oldModalBlockRegex');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Archivo actualizado exitosamente');
