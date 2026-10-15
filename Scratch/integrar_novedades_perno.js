const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'app', 'rrhh', 'nomina.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Agregar importación de ModalNovedadesPernoTramites
const importTarget = "import { ModalPerfilCargo } from '../../components/rrhh/ModalPerfilCargo';";
const importReplacement = "import { ModalPerfilCargo } from '../../components/rrhh/ModalPerfilCargo';\nimport ModalNovedadesPernoTramites from '../../components/rrhh/ModalNovedadesPernoTramites';";

if (!content.includes('ModalNovedadesPernoTramites')) {
  content = content.replace(importTarget, importReplacement);
  console.log('Import agregado');
}

// 2. Agregar estados de novedades perno
const stateTarget = "const [modalPerfilCargoVisible, setModalPerfilCargoVisible] = useState(false);";
const stateReplacement = `const [modalPerfilCargoVisible, setModalPerfilCargoVisible] = useState(false);
  // Modal de Detección de Novedades de PERNO (Cruce por Cédula últimos 6 meses para Vincular/Desvincular)
  const [modalNovedadesPernoVisible, setModalNovedadesPernoVisible] = useState(false);
  const [novedadesVinculacionDetectadas, setNovedadesVinculacionDetectadas] = useState<any[]>([]);
  const [novedadesDesvinculacionDetectadas, setNovedadesDesvinculacionDetectadas] = useState<any[]>([]);`;

if (!content.includes('modalNovedadesPernoVisible')) {
  content = content.replace(stateTarget, stateReplacement);
  console.log('Estados agregados');
}

// 3. Actualizar handleSeleccionarArchivoPerno
const uploadTarget = `      if (resultado.success) {
        mostrarModal(
          'Archivo Planta Perno Procesado',
          resultado.mensaje || 'Se enriquecieron los datos de nómina, EPS, pensión y nombramientos.',
          resultado.advertencias && resultado.advertencias.length > 0 ? 'info' : 'success',
          resultado.advertencias || []
        );
        cargarDatos();
      }`;

const uploadReplacement = `      if (resultado.success) {
        if (resultado.novedades_vinculacion || resultado.novedades_desvinculacion) {
          setNovedadesVinculacionDetectadas(resultado.novedades_vinculacion || []);
          setNovedadesDesvinculacionDetectadas(resultado.novedades_desvinculacion || []);
        }
        // Abrir automáticamente el modal para revisar personas a vincular o desvincular (últimos 6 meses)
        setModalNovedadesPernoVisible(true);
        mostrarModal(
          'Archivo Planta Perno Procesado',
          (resultado.mensaje || 'Se enriquecieron los datos de nómina, EPS, pensión y nombramientos.') +
            ' Se detectaron novedades para revisión en el modal de Vinculaciones & Desvinculaciones.',
          resultado.advertencias && resultado.advertencias.length > 0 ? 'info' : 'success',
          resultado.advertencias || []
        );
        cargarDatos();
      }`;

if (content.includes(uploadTarget)) {
  content = content.replace(uploadTarget, uploadReplacement);
  console.log('handleSeleccionarArchivoPerno actualizado');
} else {
  console.log('Aviso: No se encontró uploadTarget exacto, verificando variación CRLF');
  const uploadTargetCRLF = uploadTarget.replace(/\n/g, '\r\n');
  const uploadReplacementCRLF = uploadReplacement.replace(/\n/g, '\r\n');
  if (content.includes(uploadTargetCRLF)) {
    content = content.replace(uploadTargetCRLF, uploadReplacementCRLF);
    console.log('handleSeleccionarArchivoPerno actualizado (CRLF)');
  }
}

// 4. Agregar botón de novedades en la pestaña archivos (junto a Descargar Plantilla Oficial)
const botonArchivosTarget = `                      <Pressable
                        onPress={handleDescargarPlantillaPerno}
                        style={({ pressed }) => ({
                          backgroundColor: THEME.white,
                          borderWidth: 1,
                          borderColor: THEME.emeraldText,
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="download-outline" size={16} color={THEME.emeraldText} />
                          <Text style={{ color: THEME.emeraldText, fontSize: 12.5, fontWeight: '600' }}>
                            Descargar Plantilla Oficial (.xlsx)
                          </Text>
                        </View>
                      </Pressable>`;

const botonArchivosReplacement = `                      <Pressable
                        onPress={handleDescargarPlantillaPerno}
                        style={({ pressed }) => ({
                          backgroundColor: THEME.white,
                          borderWidth: 1,
                          borderColor: THEME.emeraldText,
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="download-outline" size={16} color={THEME.emeraldText} />
                          <Text style={{ color: THEME.emeraldText, fontSize: 12.5, fontWeight: '600' }}>
                            Descargar Plantilla Oficial (.xlsx)
                          </Text>
                        </View>
                      </Pressable>

                      {/* Botón de Detección de Novedades (Últimos 6 meses) */}
                      <Pressable
                        onPress={() => setModalNovedadesPernoVisible(true)}
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? '#ECFDF5' : '#F0FDF4',
                          borderWidth: 1.5,
                          borderColor: '#10B981',
                          paddingVertical: 9,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 4,
                          flexDirection: 'row',
                          gap: 6,
                        })}
                      >
                        <Ionicons name="sparkles" size={16} color="#047857" />
                        <Text style={{ color: '#047857', fontSize: 12.5, fontWeight: '700' }}>
                          Revisar Novedades para Vincular / Desvincular (Últimos 6 Meses)
                        </Text>
                      </Pressable>`;

if (content.includes(botonArchivosTarget)) {
  content = content.replace(botonArchivosTarget, botonArchivosReplacement);
  console.log('Botón en pestaña archivos agregado');
} else {
  const targetCRLF = botonArchivosTarget.replace(/\n/g, '\r\n');
  const repCRLF = botonArchivosReplacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, repCRLF);
    console.log('Botón en pestaña archivos agregado (CRLF)');
  }
}

// 5. Agregar botón en pestaña PERNO (encima o en cabecera de perno)
const pernoHeaderTarget = `{tabActiva === 'perno' && (
            <View style={{ gap: 20 }}>
              {/* Tarjetas KPI de PERNO */}`;

const pernoHeaderReplacement = `{tabActiva === 'perno' && (
            <View style={{ gap: 20 }}>
              {/* Barra de Acceso Rápido a Novedades de Vinculación / Desvinculación */}
              <View
                style={{
                  backgroundColor: THEME.white,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: THEME.slate200,
                  flexDirection: isDesktop ? 'row' : 'column',
                  alignItems: isDesktop ? 'center' : 'stretch',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#ECFDF5',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="git-compare" size={18} color="#047857" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.slate900 }}>
                      Cruce Automático de Novedades PERNO con Trámites (Últimos 6 Meses)
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.slate500 }}>
                      Detecta nuevas personas por vincular o desvincular cruzando por cédula con el módulo de Vinculaciones & Desvinculaciones.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setModalNovedadesPernoVisible(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: pressed ? THEME.marca900 : THEME.marca800,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                    alignSelf: isDesktop ? 'auto' : 'flex-start',
                  })}
                >
                  <Ionicons name="sparkles" size={15} color={THEME.white} />
                  <Text style={{ color: THEME.white, fontSize: 12.5, fontWeight: '700' }}>
                    Revisar Novedades (6 Meses)
                  </Text>
                </Pressable>
              </View>

              {/* Tarjetas KPI de PERNO */}`;

if (content.includes(pernoHeaderTarget)) {
  content = content.replace(pernoHeaderTarget, pernoHeaderReplacement);
  console.log('Botón en pestaña perno agregado');
} else {
  const targetCRLF = pernoHeaderTarget.replace(/\n/g, '\r\n');
  const repCRLF = pernoHeaderReplacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, repCRLF);
    console.log('Botón en pestaña perno agregado (CRLF)');
  }
}

// 6. Montar <ModalNovedadesPernoTramites> al final del componente
const modalMountTarget = `        {/* Modal de Gestión Manual de Perfil de Cargo */}
        <ModalPerfilCargo
          visible={modalPerfilCargoVisible}
          onClose={() => setModalPerfilCargoVisible(false)}
          cargoInicial={cargoSeleccionadoParaPerfil}
          idPlaza={idPlazaParaPerfil}
          totalPlazasMismoCargo={totalPlazasMismoCargo}
          onGuardadoExitoso={handlePerfilCargoGuardado}
        />`;

const modalMountReplacement = `        {/* Modal de Gestión Manual de Perfil de Cargo */}
        <ModalPerfilCargo
          visible={modalPerfilCargoVisible}
          onClose={() => setModalPerfilCargoVisible(false)}
          cargoInicial={cargoSeleccionadoParaPerfil}
          idPlaza={idPlazaParaPerfil}
          totalPlazasMismoCargo={totalPlazasMismoCargo}
          onGuardadoExitoso={handlePerfilCargoGuardado}
        />

        {/* Modal de Detección y Creación de Trámites desde PERNO (Cruce por Cédula últimos 6 meses) */}
        <ModalNovedadesPernoTramites
          visible={modalNovedadesPernoVisible}
          onClose={() => setModalNovedadesPernoVisible(false)}
          novedadesVinculacion={novedadesVinculacionDetectadas}
          novedadesDesvinculacion={novedadesDesvinculacionDetectadas}
          todoElPerno={todoElPerno}
          plazas={plazasTotales.length > 0 ? plazasTotales : plazas}
        />`;

if (content.includes(modalMountTarget)) {
  content = content.replace(modalMountTarget, modalMountReplacement);
  console.log('ModalNovedadesPernoTramites montado al final');
} else {
  const targetCRLF = modalMountTarget.replace(/\n/g, '\r\n');
  const repCRLF = modalMountReplacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, repCRLF);
    console.log('ModalNovedadesPernoTramites montado al final (CRLF)');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('nomina.tsx actualizado con éxito');
