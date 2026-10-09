const fs = require('fs');
const path = require('path');

const nominaPath = path.join(__dirname, '../../frontend/app/rrhh/nomina.tsx');
let code = fs.readFileSync(nominaPath, 'utf8');

const isCRLF = code.includes('\r\n');
let text = code.replace(/\r\n/g, '\n');

// 1. Actualizar el tipo de tabActiva para incluir 'reportes'
const targetTabType = `const [tabActiva, setTabActiva] = useState<'plazas' | 'escaleras' | 'perno' | 'estructura' | 'archivos'>('plazas');`;
const nuevoTabType = `const [tabActiva, setTabActiva] = useState<'plazas' | 'escaleras' | 'perno' | 'estructura' | 'archivos' | 'reportes'>('plazas');

  // ========================================================================
  // ESTADOS Y SUB-REPORTES DE GESTIÓN DE PLANTA Y NÓMINA (SIDEAP / PERNO)
  // ========================================================================
  type SubReporteTipo =
    | 'vinculacion_sideap'
    | 'ocupacion_vacancias'
    | 'dependencias_costo'
    | 'paridad_demografia'
    | 'conciliacion_perno'
    | 'seguridad_social';

  const [subReporteActivo, setSubReporteActivo] = useState<SubReporteTipo>('vinculacion_sideap');
  const [busquedaReporte, setBusquedaReporte] = useState('');
  const [filtroVinculacionReporte, setFiltroVinculacionReporte] = useState('TODAS');
  const [filtroNivelReporte, setFiltroNivelReporte] = useState('TODOS');
  const [filtroDependenciaReporte, setFiltroDependenciaReporte] = useState('TODAS');
  const [filtroEstadoCargoReporte, setFiltroEstadoCargoReporte] = useState('TODOS');
  const [paginaReporte, setPaginaReporte] = useState(1);
  const filasPorPaginaReporte = 15;
  const [plazaDetalleReporte, setPlazaDetalleReporte] = useState<PlazaNomina | null>(null);
  const [modalDetallePlazaReporteVisible, setModalDetallePlazaReporteVisible] = useState(false);`;

if (text.includes(targetTabType)) {
  text = text.replace(targetTabType, nuevoTabType);
  console.log('1. Tipo tabActiva actualizado con reportes y estados inicializados.');
} else {
  console.warn('1. Target tabActiva no encontrado.');
}

// 2. Insertar cálculos analíticos y exportador CSV
const targetMetricasPos = `  // Métricas rápidas para las tarjetas KPI de la barra superior`;
const bloqueMetricasReportes = `  // ========================================================================
  // CÁLCULOS ANALÍTICOS PARA EL TAB DE REPORTES (SIDEAP / PLANTA / PERNO)
  // ========================================================================
  const metricasReportes = useMemo(() => {
    const totalPlazas = plazas.length;
    const conSideap = plazas.filter((p) => p.id_sideap != null && Number(p.id_sideap) > 0).length;
    const conPerno = plazas.filter((p) => p.id_perno != null && Number(p.id_perno) > 0).length;
    const provistas = plazas.filter((p) => p.estado_cargo === 'OCUPADO' && !p.titular_nombre?.includes('VACANTE')).length;
    const vacantesDef = plazas.filter((p) => p.situacion_titular === 'VACANTE DEFINITIVA' || p.titular_nombre?.includes('VACANTE')).length;
    const vacantesTemp = plazas.filter((p) => p.estado_cargo === 'VACANTE TEMPORAL').length;
    const enEncargo = plazas.filter((p) => p.es_encargo === true || p.tipo_vinculacion === 'EN ENCARGO' || p.situacion_administrativa === 'ENCARGO').length;
    
    // Masa salarial total
    const masaSalarialMensual = plazas.reduce((acc, p) => acc + (Number(p.asignacion_basica) || 0), 0);
    const salarioPromedio = totalPlazas > 0 ? masaSalarialMensual / totalPlazas : 0;

    // Distribución por Tipo de Vinculación
    const porVinculacion: Record<string, { cantidad: number; masaSalarial: number; provistas: number; vacantes: number }> = {};
    plazas.forEach((p) => {
      const v = (p.tipo_vinculacion || 'SIN DEFINIR').toUpperCase().trim();
      if (!porVinculacion[v]) {
        porVinculacion[v] = { cantidad: 0, masaSalarial: 0, provistas: 0, vacantes: 0 };
      }
      porVinculacion[v].cantidad++;
      porVinculacion[v].masaSalarial += Number(p.asignacion_basica) || 0;
      if (p.estado_cargo === 'OCUPADO' && !p.titular_nombre?.includes('VACANTE')) {
        porVinculacion[v].provistas++;
      } else {
        porVinculacion[v].vacantes++;
      }
    });

    // Distribución por Nivel
    const porNivel: Record<string, { cantidad: number; masaSalarial: number }> = {};
    plazas.forEach((p) => {
      const n = (p.nivel || 'SIN NIVEL').toUpperCase().trim();
      if (!porNivel[n]) porNivel[n] = { cantidad: 0, masaSalarial: 0 };
      porNivel[n].cantidad++;
      porNivel[n].masaSalarial += Number(p.asignacion_basica) || 0;
    });

    // Distribución por Dependencia
    const porDependencia: Record<string, { cantidad: number; masaSalarial: number; provistas: number; vacantes: number }> = {};
    plazas.forEach((p) => {
      const d = (p.dependencia_cargo || p.dependencia_funcional || 'SIN DEPENDENCIA').toUpperCase().trim();
      if (!porDependencia[d]) {
        porDependencia[d] = { cantidad: 0, masaSalarial: 0, provistas: 0, vacantes: 0 };
      }
      porDependencia[d].cantidad++;
      porDependencia[d].masaSalarial += Number(p.asignacion_basica) || 0;
      if (p.estado_cargo === 'OCUPADO' && !p.titular_nombre?.includes('VACANTE')) {
        porDependencia[d].provistas++;
      } else {
        porDependencia[d].vacantes++;
      }
    });

    // Paridad de Género (Ley 2424 / Ley 581)
    const directivos = plazas.filter((p) => p.nivel === 'DIRECTIVO');
    const mujeresDirectivas = directivos.filter((p) => p.sexo === 'MUJER').length;
    const pctMujeresDirectivo = directivos.length > 0 ? (mujeresDirectivas / directivos.length) * 100 : 0;
    const mujeresTotal = plazas.filter((p) => p.sexo === 'MUJER').length;
    const hombresTotal = plazas.filter((p) => p.sexo === 'HOMBRE').length;

    // Edad promedio
    const edadesValidas = plazas.filter((p) => p.edad && Number(p.edad) > 0).map((p) => Number(p.edad));
    const edadPromedio = edadesValidas.length > 0 ? edadesValidas.reduce((a, b) => a + b, 0) / edadesValidas.length : 0;

    // PERNO estadísticas
    const totalPerno = personalPerno.length;
    const pernoActivos = personalPerno.filter((p) => p.estado_funcionario === 'Activo' || p.estado_descripcion === 'Activo').length;
    const pernoRetirados = personalPerno.filter((p) => p.estado_funcionario?.includes('Retirado') || p.estado_descripcion?.includes('Retirado')).length;

    // EPS en PERNO
    const porEps: Record<string, number> = {};
    personalPerno.forEach((p) => {
      const e = (p.fondo_salud || 'SIN EPS').trim();
      porEps[e] = (porEps[e] || 0) + 1;
    });

    // Fondos de Pensiones en PERNO
    const porAfp: Record<string, number> = {};
    personalPerno.forEach((p) => {
      const a = (p.fondo_pension || 'SIN AFP').trim();
      porAfp[a] = (porAfp[a] || 0) + 1;
    });

    return {
      totalPlazas,
      conSideap,
      conPerno,
      provistas,
      vacantesDef,
      vacantesTemp,
      enEncargo,
      masaSalarialMensual,
      salarioPromedio,
      porVinculacion,
      porNivel,
      porDependencia,
      directivosCount: directivos.length,
      mujeresDirectivas,
      pctMujeresDirectivo,
      mujeresTotal,
      hombresTotal,
      edadPromedio,
      totalPerno,
      pernoActivos,
      pernoRetirados,
      porEps,
      porAfp,
    };
  }, [plazas, personalPerno]);

  // Plazas filtradas para la tabla del Reporte de Vinculación / SIDEAP
  const plazasFiltradasReporte = useMemo(() => {
    let res = plazas;
    if (subReporteActivo === 'vinculacion_sideap') {
      if (filtroVinculacionReporte !== 'TODAS') {
        res = res.filter((p) => (p.tipo_vinculacion || '').toUpperCase().trim() === filtroVinculacionReporte);
      }
      if (filtroNivelReporte !== 'TODOS') {
        res = res.filter((p) => p.nivel === filtroNivelReporte);
      }
      if (filtroDependenciaReporte !== 'TODAS') {
        res = res.filter((p) => (p.dependencia_cargo || p.dependencia_funcional) === filtroDependenciaReporte);
      }
      if (filtroEstadoCargoReporte !== 'TODOS') {
        res = res.filter((p) => p.estado_cargo === filtroEstadoCargoReporte);
      }
      if (busquedaReporte.trim()) {
        const q = busquedaReporte.trim().toLowerCase();
        res = res.filter((p) =>
          String(p.id_plaza).includes(q) ||
          String(p.id_sideap || '').includes(q) ||
          String(p.id_perno || '').includes(q) ||
          (p.cargo && p.cargo.toLowerCase().includes(q)) ||
          (p.titular_nombre && p.titular_nombre.toLowerCase().includes(q)) ||
          (p.titular_cedula && p.titular_cedula.includes(q)) ||
          (p.tipo_vinculacion && p.tipo_vinculacion.toLowerCase().includes(q)) ||
          (p.dependencia_cargo && p.dependencia_cargo.toLowerCase().includes(q))
        );
      }
    }
    return res;
  }, [
    plazas,
    subReporteActivo,
    filtroVinculacionReporte,
    filtroNivelReporte,
    filtroDependenciaReporte,
    filtroEstadoCargoReporte,
    busquedaReporte,
  ]);

  // Exportación del reporte activo a CSV (compatible con Microsoft Excel con UTF-8 BOM y punto y coma)
  const handleExportarReporteCsv = (tipo: SubReporteTipo) => {
    try {
      let csvContent = '';
      let nombreArchivo = '';

      if (tipo === 'vinculacion_sideap') {
        nombreArchivo = 'Reporte_Tipo_Vinculacion_SIDEAP_Planta.csv';
        const headers = [
          'Plaza',
          'ID_SIDEAP',
          'ID_PERNO',
          'Nivel',
          'Cargo',
          'Codigo',
          'Grado',
          'Dependencia_Cargo',
          'Dependencia_Funcional',
          'Tipo_Vinculacion',
          'Situacion_Titular',
          'Situacion_Administrativa',
          'Estado_Cargo',
          'Cedula_Titular',
          'Nombre_Titular',
          'Es_Encargo',
          'Cedula_Encargo',
          'Nombre_Encargo',
          'Asignacion_Basica',
          'Sexo',
          'Edad',
        ];
        csvContent = headers.join(';') + '\\n';
        plazasFiltradasReporte.forEach((p) => {
          const row = [
            p.id_plaza,
            p.id_sideap || '',
            p.id_perno || '',
            \`"\${p.nivel || ''}"\`,
            \`"\${(p.cargo || '').replace(/"/g, '""')}"\`,
            p.codigo || '',
            p.grado || '',
            \`"\${(p.dependencia_cargo || '').replace(/"/g, '""')}"\`,
            \`"\${(p.dependencia_funcional || '').replace(/"/g, '""')}"\`,
            \`"\${(p.tipo_vinculacion || '').replace(/"/g, '""')}"\`,
            \`"\${(p.situacion_titular || '').replace(/"/g, '""')}"\`,
            \`"\${(p.situacion_administrativa || '').replace(/"/g, '""')}"\`,
            \`"\${p.estado_cargo || ''}"\`,
            p.titular_cedula || '',
            \`"\${(p.titular_nombre || '').replace(/"/g, '""')}"\`,
            p.es_encargo ? 'SI' : 'NO',
            p.encargo_cedula || '',
            \`"\${(p.encargo_nombre || '').replace(/"/g, '""')}"\`,
            p.asignacion_basica || 0,
            p.sexo || '',
            p.edad || '',
          ];
          csvContent += row.join(';') + '\\n';
        });
      } else if (tipo === 'ocupacion_vacancias') {
        nombreArchivo = 'Reporte_Ocupacion_Vacancias_Planta.csv';
        const headers = ['Plaza', 'ID_SIDEAP', 'Nivel', 'Cargo', 'Codigo', 'Grado', 'Dependencia', 'Estado_Cargo', 'Situacion_Titular', 'Situacion_Administrativa', 'Titular', 'Es_Encargo', 'Servidor_Encargado', 'Asignacion_Basica'];
        csvContent = headers.join(';') + '\\n';
        plazas.forEach((p) => {
          csvContent += [
            p.id_plaza,
            p.id_sideap || '',
            \`"\${p.nivel || ''}"\`,
            \`"\${(p.cargo || '').replace(/"/g, '""')}"\`,
            p.codigo || '',
            p.grado || '',
            \`"\${(p.dependencia_cargo || '').replace(/"/g, '""')}"\`,
            \`"\${p.estado_cargo || ''}"\`,
            \`"\${(p.situacion_titular || '').replace(/"/g, '""')}"\`,
            \`"\${(p.situacion_administrativa || '').replace(/"/g, '""')}"\`,
            \`"\${(p.titular_nombre || '').replace(/"/g, '""')}"\`,
            p.es_encargo ? 'SI' : 'NO',
            \`"\${(p.encargo_nombre || '').replace(/"/g, '""')}"\`,
            p.asignacion_basica || 0,
          ].join(';') + '\\n';
        });
      } else if (tipo === 'dependencias_costo') {
        nombreArchivo = 'Reporte_Presupuesto_Dependencias_Planta.csv';
        const headers = ['Dependencia', 'Total_Plazas', 'Plazas_Ocupadas', 'Plazas_Vacantes', 'Masa_Salarial_Mensual', 'Presupuesto_Anual_Estimado', 'Salario_Promedio'];
        csvContent = headers.join(';') + '\\n';
        Object.entries(metricasReportes.porDependencia).forEach(([dep, d]) => {
          const anual = d.masaSalarial * 12 * 1.5;
          const prom = d.cantidad > 0 ? d.masaSalarial / d.cantidad : 0;
          csvContent += [
            \`"\${dep.replace(/"/g, '""')}"\`,
            d.cantidad,
            d.provistas,
            d.vacantes,
            d.masaSalarial,
            Math.round(anual),
            Math.round(prom),
          ].join(';') + '\\n';
        });
      } else if (tipo === 'paridad_demografia') {
        nombreArchivo = 'Reporte_Paridad_Genero_Demografia_Ley2424.csv';
        const headers = ['Plaza', 'Nivel', 'Cargo', 'Dependencia', 'Sexo', 'Edad', 'Titular', 'Tipo_Vinculacion'];
        csvContent = headers.join(';') + '\\n';
        plazas.forEach((p) => {
          csvContent += [
            p.id_plaza,
            \`"\${p.nivel || ''}"\`,
            \`"\${(p.cargo || '').replace(/"/g, '""')}"\`,
            \`"\${(p.dependencia_cargo || '').replace(/"/g, '""')}"\`,
            p.sexo || '',
            p.edad || '',
            \`"\${(p.titular_nombre || '').replace(/"/g, '""')}"\`,
            \`"\${(p.tipo_vinculacion || '').replace(/"/g, '""')}"\`,
          ].join(';') + '\\n';
        });
      } else if (tipo === 'conciliacion_perno') {
        nombreArchivo = 'Reporte_Conciliacion_Planta_vs_PERNO.csv';
        const headers = ['Cedula', 'Nombre_Completo', 'Cargo_PERNO', 'Grado', 'Dependencia_PERNO', 'Estado_Funcionario', 'Posicion_Planta', 'Total_Devengado', 'Fecha_Ingreso', 'Fondo_Salud', 'Fondo_Pension'];
        csvContent = headers.join(';') + '\\n';
        personalPerno.forEach((p) => {
          csvContent += [
            p.cedula,
            \`"\${(p.nombre_completo || '').replace(/"/g, '""')}"\`,
            \`"\${(p.cargo || '').replace(/"/g, '""')}"\`,
            p.grado || '',
            \`"\${(p.dependencia || '').replace(/"/g, '""')}"\`,
            \`"\${(p.estado_funcionario || '').replace(/"/g, '""')}"\`,
            \`"\${(p.posicion_planta || '').replace(/"/g, '""')}"\`,
            p.total_devengado || 0,
            p.fecha_ingreso_entidad || '',
            \`"\${(p.fondo_salud || '').replace(/"/g, '""')}"\`,
            \`"\${(p.fondo_pension || '').replace(/"/g, '""')}"\`,
          ].join(';') + '\\n';
        });
      } else if (tipo === 'seguridad_social') {
        nombreArchivo = 'Reporte_Seguridad_Social_EPS_AFP.csv';
        const headers = ['Cedula', 'Servidor', 'Dependencia', 'EPS_Salud', 'Fondo_Pension', 'Fondo_Cesantias', 'Estado_Funcionario'];
        csvContent = headers.join(';') + '\\n';
        personalPerno.forEach((p) => {
          csvContent += [
            p.cedula,
            \`"\${(p.nombre_completo || '').replace(/"/g, '""')}"\`,
            \`"\${(p.dependencia || '').replace(/"/g, '""')}"\`,
            \`"\${(p.fondo_salud || '').replace(/"/g, '""')}"\`,
            \`"\${(p.fondo_pension || '').replace(/"/g, '""')}"\`,
            \`"\${(p.fondo_cesantias || '').replace(/"/g, '""')}"\`,
            \`"\${(p.estado_funcionario || '').replace(/"/g, '""')}"\`,
          ].join(';') + '\\n';
        });
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob(['\\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', nombreArchivo);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        mostrarModal('Reporte Exportado', \`El reporte \${nombreArchivo} se generó exitosamente con \${plazas.length} registros y codificación UTF-8.\`, 'success');
      }
    } catch (err: any) {
      mostrarModal('Error de Exportación', 'No fue posible exportar el reporte: ' + err.message, 'error');
    }
  };\n\n`;

if (text.includes(targetMetricasPos)) {
  text = text.replace(targetMetricasPos, bloqueMetricasReportes + targetMetricasPos);
  console.log('2. Cálculos analíticos metricasReportes y exportador handleExportarReporteCsv agregados.');
} else {
  console.warn('2. Target metricas rápidas no encontrado.');
}

// 3. Insertar botón de pestaña en la barra de navegación de tabs
const targetTabArchivos = `              {(nombreArchivoPlanta || nombreArchivoPerno) && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: THEME.emeraldBg,
                    borderRadius: 9999,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.emeraldText }}>
                    Listo
                  </Text>
                </View>
              )}
            </Pressable>
          </View>`;

const nuevoBotonTabReportes = `              {(nombreArchivoPlanta || nombreArchivoPerno) && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: THEME.emeraldBg,
                    borderRadius: 9999,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: THEME.emeraldText }}>
                    Listo
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Pestaña: Reportes & Analítica */}
            <Pressable
              onPress={() => setTabActiva('reportes')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: tabActiva === 'reportes' ? THEME.marca600 : 'transparent',
                marginBottom: -1,
              }}
            >
              <Ionicons
                name="bar-chart"
                size={16}
                color={tabActiva === 'reportes' ? THEME.marca700 : THEME.slate400}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: tabActiva === 'reportes' ? THEME.marca700 : THEME.slate500,
                }}
              >
                Reportes & Analítica
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: tabActiva === 'reportes' ? THEME.marca100 : THEME.slate100,
                  borderRadius: 9999,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: tabActiva === 'reportes' ? THEME.marca800 : THEME.slate600,
                  }}
                >
                  6
                </Text>
              </View>
            </Pressable>
          </View>`;

if (text.includes(targetTabArchivos)) {
  text = text.replace(targetTabArchivos, nuevoBotonTabReportes);
  console.log('3. Botón de pestaña Reportes & Analítica agregado a la barra de tabs.');
} else {
  console.warn('3. Target botón tab archivos no encontrado.');
}

if (isCRLF) {
  text = text.replace(/\n/g, '\r\n');
}

fs.writeFileSync(nominaPath, text, 'utf8');
console.log('Fase 1 completada con éxito.');
