const fs = require('fs');

const targetPath = 'c:/Users/jcarl/.gemini/antigravity/scratch/administrative-requests/frontend/app/rrhh/vinculaciones-desvinculaciones.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Export signature
content = content.replace(
  'export default function VinculacionesDesvinculacionesScreen() {',
  'export default function VinculacionesDesvinculacionesScreen({ tabInicial }: { tabInicial?: \'ingresos\' | \'desvinculaciones\' } = {}) {'
);

// 2. tabActiva state & independent filters
const oldTabState =   // Pestañas principales (estilo Nómina)
  const [tabActiva, setTabActiva] = useState<
    'flujos' | 'secop' | 'ingresos' | 'paz_salvo' | 'matriz_normativa'
  >('flujos');

  // Control de KPIs
  const [mostrarKpis, setMostrarKpis] = useState(true);

  // Filtros de Trámites
  const [filtroTipoProceso, setFiltroTipoProceso] = useState<
    'TODOS' | 'DESVINCULACION' | 'VINCULACION'
  >('TODOS');
  const [filtroModalidad, setFiltroModalidad] = useState<'TODAS' | ModalidadPersonal>('TODAS');
  const [busqueda, setBusqueda] = useState('');;

const newTabState =   // Pestañas principales divididas en Ingresos y Desvinculaciones (estilo Nómina)
  const [tabActiva, setTabActiva] = useState<
    'ingresos' | 'desvinculaciones' | 'secop' | 'validacion_ia' | 'paz_salvo' | 'matriz_normativa'
  >(tabInicial || 'ingresos');

  // Control de KPIs
  const [mostrarKpis, setMostrarKpis] = useState(true);

  // Filtros de búsqueda específicos para Ingresos
  const [filtroModalidadIngreso, setFiltroModalidadIngreso] = useState<'TODAS' | ModalidadPersonal>('TODAS');
  const [busquedaIngresos, setBusquedaIngresos] = useState('');

  // Filtros de búsqueda específicos para Desvinculaciones
  const [filtroModalidadDesvinculacion, setFiltroModalidadDesvinculacion] = useState<'TODAS' | ModalidadPersonal>('TODAS');
  const [busquedaDesvinculaciones, setBusquedaDesvinculaciones] = useState('');;

if (!content.includes(oldTabState)) {
  console.error('Error: No se encontró oldTabState exacto. Revisando...');
} else {
  content = content.replace(oldTabState, newTabState);
  console.log('Paso 1: tabActiva y filtros actualizados correctamente.');
}

fs.writeFileSync(targetPath, content, 'utf8');
