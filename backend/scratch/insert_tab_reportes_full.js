const fs = require('fs');
const path = require('path');

const nominaPath = path.join(__dirname, '../../frontend/app/rrhh/nomina.tsx');
let code = fs.readFileSync(nominaPath, 'utf8');

const isCRLF = code.includes('\r\n');
let text = code.replace(/\r\n/g, '\n');

// 1. Insertar metricasReportes, plazasFiltradasReporte y handleExportarReporteCsv
const targetInsertLogica = `    return { total, activos, retirados, conPlaza };
  }, [todoElPerno, plazas, todasLasPlazas]);`;

const bloqueLogicaReportes = `    return { total, activos, retirados, conPlaza };
  }, [todoElPerno, plazas, todasLasPlazas]);

  // ========================================================================
  // CÁLCULOS ANALÍTICOS Y METRICAS PARA REPORTES DE PLANTA Y NÓMINA
  // ========================================================================
  const metricasReportes = useMemo(() => {
    const listPlazas = plazas.length > 0 ? plazas : todasLasPlazas;
    const totalPlazas = listPlazas.length;
    const conSideap = listPlazas.filter((p) => p.id_sideap != null && Number(p.id_sideap) > 0).length;
    const conPerno = listPlazas.filter((p) => p.id_perno != null && Number(p.id_perno) > 0).length;
    const provistas = listPlazas.filter((p) => p.estado_cargo === 'OCUPADO' && !p.titular_nombre?.includes('VACANTE')).length;
    const vacantesDef = listPlazas.filter((p) => p.situacion_titular === 'VACANTE DEFINITIVA' || p.titular_nombre?.includes('VACANTE')).length;
    const vacantesTemp = listPlazas.filter((p) => p.estado_cargo === 'VACANTE TEMPORAL').length;
    const enEncargo = listPlazas.filter((p) => p.es_encargo === true || p.tipo_vinculacion === 'EN ENCARGO' || p.situacion_administrativa === 'ENCARGO').length;
    
    // Masa salarial total
    const masaSalarialMensual = listPlazas.reduce((acc, p) => acc + (Number(p.asignacion_basica) || 0), 0);
    const salarioPromedio = totalPlazas > 0 ? masaSalarialMensual / totalPlazas : 0;

    // Distribución por Tipo de Vinculación
    const porVinculacion: Record<string, { cantidad: number; masaSalarial: number; provistas: number; vacantes: number }> = {};
    listPlazas.forEach((p) => {
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
    listPlazas.forEach((p) => {
      const n = (p.nivel || 'SIN NIVEL').toUpperCase().trim();
      if (!porNivel[n]) porNivel[n] = { cantidad: 0, masaSalarial: 0 };
      porNivel[n].cantidad++;
      porNivel[n].masaSalarial += Number(p.asignacion_basica) || 0;
    });

    // Distribución por Dependencia
    const porDependencia: Record<string, { cantidad: number; masaSalarial: number; provistas: number; vacantes: number }> = {};
    listPlazas.forEach((p) => {
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
    const directivos = listPlazas.filter((p) => p.nivel === 'DIRECTIVO');
    const mujeresDirectivas = directivos.filter((p) => p.sexo === 'MUJER').length;
    const pctMujeresDirectivo = directivos.length > 0 ? (mujeresDirectivas / directivos.length) * 100 : 0;
    const mujeresTotal = listPlazas.filter((p) => p.sexo === 'MUJER').length;
    const hombresTotal = listPlazas.filter((p) => p.sexo === 'HOMBRE').length;

    // Edad promedio
    const edadesValidas = listPlazas.filter((p) => p.edad && Number(p.edad) > 0).map((p) => Number(p.edad));
    const edadPromedio = edadesValidas.length > 0 ? edadesValidas.reduce((a, b) => a + b, 0) / edadesValidas.length : 0;

    // EPS en PERNO
    const porEps: Record<string, number> = {};
    todoElPerno.forEach((p) => {
      const e = (p.fondo_salud || 'SIN EPS').trim();
      porEps[e] = (porEps[e] || 0) + 1;
    });

    // Fondos de Pensiones en PERNO
    const porAfp: Record<string, number> = {};
    todoElPerno.forEach((p) => {
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
      porEps,
      porAfp,
    };
  }, [plazas, todasLasPlazas, todoElPerno]);

  // Plazas filtradas para la tabla del Reporte de Vinculación / SIDEAP
  const plazasFiltradasReporte = useMemo(() => {
    const listPlazas = plazas.length > 0 ? plazas : todasLasPlazas;
    let res = listPlazas;
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
    todasLasPlazas,
    subReporteActivo,
    filtroVinculacionReporte,
    filtroNivelReporte,
    filtroDependenciaReporte,
    filtroEstadoCargoReporte,
    busquedaReporte,
  ]);

  // Exportación del reporte activo a CSV (compatible con Excel con UTF-8 BOM y punto y coma)
  const handleExportarReporteCsv = (tipo: SubReporteTipo) => {
    try {
      const listPlazas = plazas.length > 0 ? plazas : todasLasPlazas;
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
        listPlazas.forEach((p) => {
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
        listPlazas.forEach((p) => {
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
        todoElPerno.forEach((p) => {
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
        todoElPerno.forEach((p) => {
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
        mostrarModal('Reporte Exportado', \`El reporte \${nombreArchivo} se generó exitosamente con \${listPlazas.length} registros y codificación UTF-8 con punto y coma.\`, 'success');
      }
    } catch (err: any) {
      mostrarModal('Error de Exportación', 'No fue posible exportar el reporte: ' + err.message, 'error');
    }
  };`;

if (text.includes(targetInsertLogica) && !text.includes("CÁLCULOS ANALÍTICOS Y METRICAS PARA REPORTES")) {
  text = text.replace(targetInsertLogica, bloqueLogicaReportes);
  console.log('1. Lógica analítica de reportes insertada.');
} else {
  console.log('1. Lógica analítica ya presente o target no encontrado.');
}

fs.writeFileSync(nominaPath, text, 'utf8');
console.log('Fase 2 de script lista.');
