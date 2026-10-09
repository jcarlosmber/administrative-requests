const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../app/rrhh/vinculaciones-desvinculaciones.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const oldHeader = `                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View
                              style={{
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 9999,
                                backgroundColor: esVinculacion ? THEME.emeraldBg : THEME.roseBg,
                                borderWidth: 1,
                                borderColor: esVinculacion ? THEME.emeraldRing : THEME.roseRing,
                              }}
                            >
                              <Text
                                style={{
                                  color: esVinculacion ? THEME.emeraldText : THEME.roseText,
                                  fontSize: 9.5,
                                  fontWeight: '700',
                                }}
                              >
                                {esVinculacion ? 'VINCULACIÓN' : 'DESVINCULACIÓN'}
                              </Text>
                            </View>

                            {/* Badge Específico de Modalidad */}
                            {(() => {
                              const infoM = obtenerInfoModalidad(c.modalidad);
                              return (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 3,
                                    paddingHorizontal: 6,
                                    paddingVertical: 1.5,
                                    borderRadius: 4,
                                    backgroundColor: infoM.colorBg,
                                    borderWidth: 1,
                                    borderColor: infoM.colorBorde,
                                  }}
                                >
                                  <Ionicons name={infoM.icono} size={10} color={infoM.colorTexto} />
                                  <Text
                                    style={{
                                      color: infoM.colorTexto,
                                      fontSize: 9.5,
                                      fontWeight: '800',
                                    }}
                                  >
                                    {infoM.badgeTexto}
                                  </Text>
                                </View>
                              );
                            })()}

                            <Text
                              style={{ color: THEME.slate400, fontSize: 10.5, fontWeight: '600' }}
                            >
                              {c.id}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: THEME.emeraldText,
                              fontSize: 11.5,
                              fontWeight: '700',
                            }}
                          >
                            {porcentaje}%
                          </Text>
                        </View>`;

const newHeader = `                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <View
                              style={{
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 9999,
                                backgroundColor: esVinculacion ? THEME.emeraldBg : THEME.roseBg,
                                borderWidth: 1,
                                borderColor: esVinculacion ? THEME.emeraldRing : THEME.roseRing,
                              }}
                            >
                              <Text
                                style={{
                                  color: esVinculacion ? THEME.emeraldText : THEME.roseText,
                                  fontSize: 9.5,
                                  fontWeight: '700',
                                }}
                              >
                                {esVinculacion ? 'VINCULACIÓN' : 'DESVINCULACIÓN'}
                              </Text>
                            </View>

                            {/* Badge Específico de Modalidad */}
                            {(() => {
                              const infoM = obtenerInfoModalidad(c.modalidad);
                              return (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 3,
                                    paddingHorizontal: 6,
                                    paddingVertical: 1.5,
                                    borderRadius: 4,
                                    backgroundColor: infoM.colorBg,
                                    borderWidth: 1,
                                    borderColor: infoM.colorBorde,
                                  }}
                                >
                                  <Ionicons name={infoM.icono} size={10} color={infoM.colorTexto} />
                                  <Text
                                    style={{
                                      color: infoM.colorTexto,
                                      fontSize: 9.5,
                                      fontWeight: '800',
                                    }}
                                  >
                                    {infoM.badgeTexto}
                                  </Text>
                                </View>
                              );
                            })()}
                          </View>

                          <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                            <Text
                              style={{
                                color: THEME.slate400,
                                fontSize: 10,
                                fontWeight: '700',
                                letterSpacing: 0.2,
                              }}
                            >
                              {c.id}
                            </Text>
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 9999,
                                backgroundColor: THEME.emeraldBg,
                                borderWidth: 1,
                                borderColor: THEME.emeraldRing,
                              }}
                            >
                              <Text
                                style={{
                                  color: THEME.emeraldText,
                                  fontSize: 10.5,
                                  fontWeight: '700',
                                }}
                              >
                                {porcentaje}%
                              </Text>
                            </View>
                          </View>
                        </View>`;

// Normalizar CRLF
const normContent = content.replace(/\r\n/g, '\n');
const normOld = oldHeader.replace(/\r\n/g, '\n');
const normNew = newHeader.replace(/\r\n/g, '\n');

if (normContent.includes(normOld)) {
  const updated = normContent.replace(normOld, normNew);
  // Conservar formato CRLF si el original lo tenía
  const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
  fs.writeFileSync(targetFile, finalContent, 'utf8');
  console.log('✓ Cabecera de la tarjeta actualizada exitosamente.');
} else {
  console.error('✗ No se encontró el bloque a reemplazar.');
}
