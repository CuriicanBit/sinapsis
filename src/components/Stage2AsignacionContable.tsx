import React, { useState } from 'react';
import { Project, Role, Area, OFFICIAL_AREAS } from '../types/budget';
import { formatCLP, getAccountByCode, downloadApreExportCSV, AREA_CONFIG } from '../utils/formatters';
import { useCatalog } from '../CatalogContext';
import { 
  deduceAccountForItem, 
  saveLearnedPattern, 
  DeductionResult 
} from '../utils/accountingRules';
import { 
  Building2, 
  HelpCircle,
  Layers,
  ArrowRight,
  Sparkles,
  BrainCircuit,
  FolderTree,
  List,
  AlertTriangle,
  CheckCircle2,
  Check,
  Download,
  Lock,
  Filter,
  CheckSquare
} from 'lucide-react';

interface Stage2AsignacionContableProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  currentRole: Role;
  onGoToNextStage: () => void;
  currentFiscalYear?: number;
}

export const Stage2AsignacionContable: React.FC<Stage2AsignacionContableProps> = ({
  projects,
  onUpdateProject,
  currentRole,
  onGoToNextStage,
  currentFiscalYear = 2026,
}) => {
  const { cuentas } = useCatalog();
  // 1. Filter: Validated Projects from Stage 1 (default: ONLY validated)
  const [showValidatedOnly, setShowValidatedOnly] = useState<boolean>(true);
  const [filterAccountStatus, setFilterAccountStatus] = useState<'all' | 'pending' | 'assigned'>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [groupByProject, setGroupByProject] = useState<boolean>(true);
  const [learningNotification, setLearningNotification] = useState<string | null>(null);

  // Validated projects from Stage 1
  const validatedProjects = projects.filter((p) => p.reviewStatus === 'Aprobado');
  const activeProjects = showValidatedOnly ? validatedProjects : projects;

  // Flatten items for active projects with reference to parent project and deduction
  const allItemsWithProject = activeProjects.flatMap((p) =>
    p.items.map((item) => {
      const deduction = deduceAccountForItem(item.description, p.area);
      return {
        ...item,
        project: p,
        deduction,
      };
    })
  );

  // Totals calculations
  let totalPresupuesto = 0;
  let totalActivoCapex = 0;
  let totalGastoOpex = 0;
  let pendingAssignmentCount = 0;
  let classifiedCount = 0;

  allItemsWithProject.forEach((item) => {
    totalPresupuesto += item.totalPriceCLP;
    const account = getAccountByCode(item.accountCode);
    if (!account) {
      pendingAssignmentCount++;
    } else {
      classifiedCount++;
      if (account.type === 'Activo') {
        totalActivoCapex += item.totalPriceCLP;
      } else if (account.type === 'Gasto') {
        totalGastoOpex += item.totalPriceCLP;
      }
    }
  });

  const totalItemsCount = allItemsWithProject.length;
  const progressPercent = totalItemsCount > 0 ? Math.round((classifiedCount / totalItemsCount) * 100) : 0;
  const capexPercent = totalPresupuesto > 0 ? Math.round((totalActivoCapex / totalPresupuesto) * 100) : 0;
  const opexPercent = totalPresupuesto > 0 ? Math.round((totalGastoOpex / totalPresupuesto) * 100) : 0;

  // Single manual or suggested account assignment by Paola
  const handleAssignAccount = (projectId: string, itemId: string, accountCode: string, itemDescription?: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const updatedItems = project.items.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          accountCode: accountCode === '' ? undefined : accountCode,
        };
      }
      return it;
    });

    onUpdateProject({
      ...project,
      items: updatedItems,
    });

    if (accountCode && itemDescription) {
      saveLearnedPattern(itemDescription, accountCode);
      setLearningNotification(`Patrón aprendido: "${itemDescription.slice(0, 32)}..." asignado a cuenta ${accountCode}.`);
      setTimeout(() => setLearningNotification(null), 3000);
    }
  };

  // Bulk assign all items in a single project
  const handleBulkAssignProject = (projectId: string, accountCode: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const updatedItems = project.items.map((it) => ({
      ...it,
      accountCode,
    }));

    onUpdateProject({
      ...project,
      items: updatedItems,
    });

    project.items.forEach((it) => {
      if (it.description) saveLearnedPattern(it.description, accountCode);
    });

    setLearningNotification(`Asignada cuenta ${accountCode} a todos los ítems del proyecto ${project.code}.`);
    setTimeout(() => setLearningNotification(null), 3000);
  };

  // 2. Asistencia Inteligente: Sugerir cuentas automáticamente analizando palabras clave
  const handleAutoDeduceAll = () => {
    let assignedCount = 0;
    let alreadyAssigned = 0;

    activeProjects.forEach((proj) => {
      let hasChanges = false;
      const updatedItems = proj.items.map((it) => {
        if (!it.accountCode) {
          const deduction = deduceAccountForItem(it.description, proj.area);
          if (deduction && deduction.accountCode) {
            assignedCount++;
            hasChanges = true;
            return {
              ...it,
              accountCode: deduction.accountCode,
            };
          }
        } else {
          alreadyAssigned++;
        }
        return it;
      });

      if (hasChanges) {
        onUpdateProject({
          ...proj,
          items: updatedItems,
        });
      }
    });

    setLearningNotification(
      `Asistencia Inteligente: Se asignaron automáticamente ${assignedCount} cuentas analizando palabras clave de ítems.`
    );
    setTimeout(() => setLearningNotification(null), 4500);
  };

  // Filtered items for display
  const filteredItems = allItemsWithProject.filter((item) => {
    const matchesStatus =
      filterAccountStatus === 'all'
        ? true
        : filterAccountStatus === 'pending'
        ? !item.accountCode
        : !!item.accountCode;
    const matchesArea = filterArea === 'all' ? true : item.project.area === filterArea;
    return matchesStatus && matchesArea;
  });

  // Calculate totals by official account
  const accountTotals = cuentas.map((acc) => {
    const itemsInAccount = allItemsWithProject.filter((it) => it.accountCode === acc.code);
    const amount = itemsInAccount.reduce((sum, it) => sum + it.totalPriceCLP, 0);
    return {
      ...acc,
      itemCount: itemsInAccount.length,
      amount,
      percentage: totalPresupuesto > 0 ? Math.round((amount / totalPresupuesto) * 100) : 0,
    };
  }).filter((acc) => acc.itemCount > 0);

  // Calculate totals by Area TIC
  const allAreasList: Area[] = OFFICIAL_AREAS;
  const areaTotals = allAreasList.map((area) => {
    const itemsInArea = allItemsWithProject.filter((it) => it.project.area === area);
    const amount = itemsInArea.reduce((sum, it) => sum + it.totalPriceCLP, 0);
    const capex = itemsInArea
      .filter((it) => getAccountByCode(it.accountCode)?.type === 'Activo')
      .reduce((sum, it) => sum + it.totalPriceCLP, 0);
    const opex = itemsInArea
      .filter((it) => getAccountByCode(it.accountCode)?.type === 'Gasto')
      .reduce((sum, it) => sum + it.totalPriceCLP, 0);

    return {
      area,
      amount,
      capex,
      opex,
      itemCount: itemsInArea.length,
      percentage: totalPresupuesto > 0 ? Math.round((amount / totalPresupuesto) * 100) : 0,
    };
  }).filter((a) => a.itemCount > 0);

  // Grouped projects representation
  const filteredProjectsMap = new Map<string, Project>();
  filteredItems.forEach((it) => {
    if (!filteredProjectsMap.has(it.project.id)) {
      filteredProjectsMap.set(it.project.id, it.project);
    }
  });
  const groupedProjects = Array.from(filteredProjectsMap.values());

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {learningNotification && (
        <div className="p-3.5 bg-[#0F294A] text-white text-sm font-semibold rounded-xl shadow-lg border border-blue-700 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{learningNotification}</span>
          </div>
          <button
            onClick={() => setLearningNotification(null)}
            className="text-blue-300 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Context & Paola's Work Panel */}
      <section aria-label="Panel de Trabajo de Coordinación Contable" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#da291c] uppercase tracking-wider mb-1">
              <span>Etapa 2 de 5</span>
              <span>·</span>
              <span>Gestión Presupuestaria Institucional (Coordinación TIC)</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Panel de Asignación Contable (Coordinadora - Paola)
            </h2>
            <p className="text-base text-slate-600 mt-1 max-w-4xl">
              Asocie cada ítem validado con su cuenta contable oficial de la Universidad Autónoma. Utilice la <strong>Asistencia Inteligente</strong> para deducir cuentas automáticamente por palabras clave o ajuste cada partida según el catálogo CAPEX / OPEX.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Auto-Deduce Button */}
            <button
              onClick={handleAutoDeduceAll}
              className="flex items-center gap-2 bg-[#ff6900] hover:bg-[#e05c00] text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-sm cursor-pointer"
              title="Analizar descripciones de ítems y sugerir cuentas según palabras clave y memoria"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Sugerir Cuentas Automáticamente</span>
            </button>

            {/* Export CSV for APRE */}
            <button
              onClick={() => {
                downloadApreExportCSV(projects, currentFiscalYear, `PRESUPUESTO_CARGA_APRE_${currentFiscalYear}_${new Date().toISOString().slice(0, 10)}.csv`);
                setLearningNotification(`Archivo CSV para plataforma APRE ${currentFiscalYear} descargado exitosamente con 27 columnas corporativas.`);
                setTimeout(() => setLearningNotification(null), 4500);
              }}
              className="flex items-center gap-2 bg-[#000000] hover:bg-[#222222] text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-sm cursor-pointer border border-[#333333]"
              title="Descargar archivo CSV normalizado con las 27 columnas corporativas de Universidad Autónoma de Chile"
            >
              <Download className="w-4 h-4 text-[#ff6900]" />
              <span>Exportar CSV para APRE</span>
            </button>

            {/* 4. Control de Avance y Paso a Etapa 3 (Only enabled when 100% classified) */}
            {pendingAssignmentCount === 0 && totalItemsCount > 0 ? (
              <button
                onClick={onGoToNextStage}
                className="flex items-center gap-2 bg-[#da291c] hover:bg-[#b81e13] text-white font-bold px-5 py-2.5 rounded-lg shadow-md transition-all text-sm cursor-pointer ring-1 ring-white/20"
              >
                <span>Validar y Avanzar a Etapa 3 (Aprobación APRE)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 bg-slate-200 text-slate-500 border border-slate-300 px-4 py-2.5 rounded-lg text-sm font-bold cursor-not-allowed"
                title={`Faltan ${pendingAssignmentCount} ítems por clasificar para poder avanzar a la Etapa 3.`}
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Validar y Avanzar a Etapa 3 ({pendingAssignmentCount} pendientes)</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Validation Filter Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-700 shrink-0" />
            <span className="font-bold text-slate-700">Filtro de Planificación Etapa 1:</span>
            <div className="flex items-center bg-white border border-slate-300 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setShowValidatedOnly(true)}
                className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                  showValidatedOnly
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✓ Solo Proyectos Validados por Director ({validatedProjects.length})
              </button>
              <button
                type="button"
                onClick={() => setShowValidatedOnly(false)}
                className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                  !showValidatedOnly
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos los Proyectos ({projects.length})
              </button>
            </div>
          </div>

          <div className="text-slate-600 font-medium">
            {showValidatedOnly ? (
              <span className="text-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Trabajando exclusivamente con proyectos validados por Dirección TIC.
              </span>
            ) : (
              <span className="text-amber-800 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Mostrando todos los proyectos (incluyendo borradores sin validar).
              </span>
            )}
          </div>
        </div>

        {/* 3. Real-Time Consolidated Strategic Metrics & Progress Bar */}
        <div className="space-y-4 pt-2">
          {/* Progress Indicator Bar */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-700" />
                <span className="text-sm font-bold text-slate-800">
                  Progreso de Clasificación Contable:
                </span>
                <span className="text-sm font-extrabold text-blue-900 font-tabular bg-white px-2 py-0.5 rounded border border-slate-300">
                  {classifiedCount} de {totalItemsCount} ítems clasificados ({progressPercent}%)
                </span>
              </div>

              {pendingAssignmentCount > 0 ? (
                <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                  Faltan {pendingAssignmentCount} ítems para completar el 100% y avanzar a APRE
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  100% de ítems clasificados. Listo para avanzar a Aprobación APRE
                </span>
              )}
            </div>

            {/* Visual Animated Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  progressPercent === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm font-semibold text-slate-500">Presupuesto Validado Total</p>
              <p className="text-2xl font-bold text-slate-900 font-tabular mt-1">
                {formatCLP(totalPresupuesto)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{totalItemsCount} ítems en planificación</p>
            </div>

            <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-blue-900">Total CAPEX (Inversión)</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900 font-tabular">
                  {capexPercent}%
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-900 font-tabular mt-1">
                {formatCLP(totalActivoCapex)}
              </p>
              <p className="text-xs text-blue-700 mt-1">Equipos Computacionales, Máquinas, Licencias CAPEX</p>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-emerald-900">Total OPEX (Operación)</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-tabular">
                  {opexPercent}%
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-900 font-tabular mt-1">
                {formatCLP(totalGastoOpex)}
              </p>
              <p className="text-xs text-emerald-700 mt-1">Mantenciones, Serv. Informáticos, Arriendos</p>
            </div>

            <div
              className={`p-4 rounded-lg border ${
                pendingAssignmentCount > 0
                  ? 'bg-amber-50/90 border-amber-300'
                  : 'bg-emerald-50/70 border-emerald-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-700">Ítems Pendientes de Cuenta</p>
              <p
                className={`text-2xl font-bold font-tabular mt-1 ${
                  pendingAssignmentCount > 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                {pendingAssignmentCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {pendingAssignmentCount > 0 ? 'Requieren asignación para desbloquear APRE' : '100% de ítems listos'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Control Toolbar: Status Filter, Area Filter and Group-By Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilterAccountStatus('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                filterAccountStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({allItemsWithProject.length})
            </button>
            <button
              onClick={() => setFilterAccountStatus('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                filterAccountStatus === 'pending'
                  ? 'bg-amber-200 text-amber-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendientes ({pendingAssignmentCount})
            </button>
            <button
              onClick={() => setFilterAccountStatus('assigned')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                filterAccountStatus === 'assigned'
                  ? 'bg-emerald-200 text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Asignados ({classifiedCount})
            </button>
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Área TIC:</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:bg-white"
            >
              <option value="all">Todas las Áreas</option>
              {allAreasList.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Group By Project Switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Vista:</span>
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setGroupByProject(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                groupByProject
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Agrupar por Proyecto</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupByProject(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                !groupByProject
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista Plana Consolidada</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Columns: Items Grid (Wide and Clear for Paola) */}
        <div className="xl:col-span-2 space-y-4">
          {projects.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Aún no hay proyectos formulados para el ejercicio {currentFiscalYear}
              </h3>
              <p className="text-base text-slate-600 mb-4 max-w-md mx-auto">
                Debe formular proyectos en la Etapa 1 para poder asociar sus cuentas contables institucionales.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="text-lg font-medium text-slate-700">No se encontraron ítems con los filtros seleccionados.</p>
              <p className="text-xs text-slate-500 mt-1">Verifique si tiene activo el filtro de solo proyectos validados o cambie de área.</p>
            </div>
          ) : groupByProject ? (
            /* GROUPED BY PROJECT VIEW */
            <div className="space-y-5">
              {groupedProjects.map((project) => {
                const projectItems = filteredItems.filter((it) => it.project.id === project.id);
                if (projectItems.length === 0) return null;

                const projectSubtotal = projectItems.reduce((sum, it) => sum + it.totalPriceCLP, 0);
                const projectPending = projectItems.filter((it) => !it.accountCode).length;
                const areaStyle = AREA_CONFIG[project.area] || AREA_CONFIG['Salas Especiales'];

                return (
                  <div
                    key={project.id}
                    className={`bg-white border rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all border-l-4 ${areaStyle.border}`}
                  >
                    {/* Project Header Bar with Quick Bulk Assign */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                            {project.code}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${areaStyle.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${areaStyle.dot}`} />
                            <span>{project.area}</span>
                          </span>
                          {projectPending > 0 ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              {projectPending} pendiente{projectPending > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Completo
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          {project.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Subtotal Proyecto</span>
                          <span className="text-sm font-bold font-tabular text-slate-900 block">
                            {formatCLP(projectSubtotal)}
                          </span>
                        </div>

                        {/* Bulk Action for this Project */}
                        <div className="border-l border-slate-300 pl-3">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleBulkAssignProject(project.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                            className="text-xs p-1.5 bg-white border border-slate-300 rounded font-semibold text-blue-900 hover:border-blue-500 cursor-pointer"
                          >
                            <option value="" disabled>
                              Asignar cuenta a todo el proyecto...
                            </option>
                            {cuentas.map((acc) => (
                              <option key={acc.code} value={acc.code}>
                                {acc.code} - {acc.name} ({acc.categoryLabel || (acc.type === 'Activo' ? 'Inversión' : 'Operación')})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Items table for this project */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase">
                          <tr>
                            <th className="py-3 px-3">Descripción del Ítem</th>
                            <th className="py-3 px-3 text-center w-16">Cant</th>
                            <th className="py-3 px-3 text-right w-28">Total CLP</th>
                            <th className="py-3 px-3 min-w-[320px]">Cuenta Contable Institucional</th>
                            <th className="py-3 px-3 text-center w-24">Tipo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {projectItems.map((item) => {
                            const account = getAccountByCode(item.accountCode);
                            const deduction = item.deduction;
                            const isAssigned = !!item.accountCode;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/80">
                                <td className="py-3 px-3 align-middle">
                                  <p className="font-semibold text-slate-900 text-base leading-snug">
                                    {item.description}
                                  </p>
                                  <p className="text-xs text-slate-500 font-tabular mt-0.5">
                                    Costo Unitario: {formatCLP(item.unitPriceCLP)}
                                  </p>

                                  {/* Intelligent Deduction / Suggestion Badge */}
                                  {!item.accountCode && deduction && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 text-xs font-bold border border-purple-200 shadow-2xs">
                                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Sugerido por IA: <strong>{deduction.accountCode}</strong></span>
                                        <span className="text-[10px] text-purple-700 font-normal">({deduction.confidence}%)</span>
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAssignAccount(
                                            item.project.id,
                                            item.id,
                                            deduction.accountCode,
                                            item.description
                                          )
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                        title={`Aceptar propuesta: ${deduction.reason}`}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Aceptar</span>
                                      </button>
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-3 align-middle text-center font-tabular font-bold text-slate-800 text-base">
                                  {item.quantity}
                                </td>

                                <td className="py-3 px-3 align-middle text-right font-tabular font-bold text-slate-900 whitespace-nowrap text-base">
                                  {formatCLP(item.totalPriceCLP)}
                                </td>

                                <td className="py-3 px-3 align-middle">
                                  {/* Flat Official Accounts Selector */}
                                  <select
                                    value={item.accountCode || ''}
                                    onChange={(e) =>
                                      handleAssignAccount(
                                        item.project.id,
                                        item.id,
                                        e.target.value,
                                        item.description
                                      )
                                    }
                                    className={`w-full p-2.5 text-sm rounded-lg border font-semibold transition-colors cursor-pointer ${
                                      !isAssigned
                                        ? 'border-amber-400 bg-amber-50 text-amber-950 font-bold focus:ring-2 focus:ring-amber-500'
                                        : 'border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                                    }`}
                                  >
                                    <option value="">-- Seleccionar Cuenta Contable --</option>
                                    {cuentas.map((acc) => (
                                      <option key={acc.code} value={acc.code}>
                                        {acc.code} - {acc.name} ({acc.categoryLabel || (acc.type === 'Activo' ? 'Inversión' : 'Operación')})
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                <td className="py-3 px-3 align-middle text-center">
                                  {account ? (
                                    <span
                                      className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md border ${
                                        account.type === 'Activo'
                                          ? 'bg-blue-100 text-blue-900 border-blue-200'
                                          : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                      }`}
                                    >
                                      {account.type === 'Activo' ? 'CAPEX' : 'OPEX'}
                                    </span>
                                  ) : (
                                    <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                      Pendiente
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* FLAT LIST VIEW */
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Lista Plana Consolidada de Ítems
                  </h4>
                  <p className="text-xs text-slate-500">
                    Mostrando {filteredItems.length} líneas de ítems de proyectos seleccionados.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase">
                    <tr>
                      <th className="py-3 px-3">Proyecto / Área</th>
                      <th className="py-3 px-3">Descripción del Ítem</th>
                      <th className="py-3 px-3 text-center w-16">Cant</th>
                      <th className="py-3 px-3 text-right w-28">Total CLP</th>
                      <th className="py-3 px-3 min-w-[320px]">Cuenta Contable Institucional</th>
                      <th className="py-3 px-3 text-center w-24">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredItems.map((item) => {
                      const account = getAccountByCode(item.accountCode);
                      const isAssigned = !!item.accountCode;
                      const deduction = item.deduction;
                      const areaStyle = AREA_CONFIG[item.project.area] || AREA_CONFIG['Salas Especiales'];

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 align-top">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded block w-max">
                              {item.project.code}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.2 rounded-full border mt-1 ${areaStyle.badge}`}>
                              <span>{item.project.area}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <p className="font-semibold text-slate-900 text-base">
                              {item.description}
                            </p>
                            <p className="text-xs text-slate-500 font-tabular mt-0.5">
                              Unitario: {formatCLP(item.unitPriceCLP)}
                            </p>

                            {!item.accountCode && deduction && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 text-xs font-bold border border-purple-200">
                                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Sugerido por IA: {deduction.accountCode}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAssignAccount(
                                      item.project.id,
                                      item.id,
                                      deduction.accountCode,
                                      item.description
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Aceptar</span>
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 align-top text-center font-tabular font-bold text-slate-800 text-base">
                            {item.quantity}
                          </td>

                          <td className="py-3 px-3 align-top text-right font-tabular font-bold text-slate-900 whitespace-nowrap text-base">
                            {formatCLP(item.totalPriceCLP)}
                          </td>

                          <td className="py-3 px-3 align-top">
                            <select
                              value={item.accountCode || ''}
                              onChange={(e) =>
                                handleAssignAccount(
                                  item.project.id,
                                  item.id,
                                  e.target.value,
                                  item.description
                                )
                              }
                              className={`w-full p-2.5 text-sm rounded-lg border font-semibold transition-colors cursor-pointer ${
                                !isAssigned
                                  ? 'border-amber-400 bg-amber-50 text-amber-950 font-bold focus:ring-2 focus:ring-amber-500'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-blue-600'
                              }`}
                            >
                              <option value="">-- Seleccionar Cuenta Contable --</option>
                              {cuentas.map((acc) => (
                                <option key={acc.code} value={acc.code}>
                                  {acc.code} - {acc.name} ({acc.categoryLabel || (acc.type === 'Activo' ? 'Inversión' : 'Operación')})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3 px-3 align-top text-center">
                            {account ? (
                              <span
                                className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md border ${
                                  account.type === 'Activo'
                                    ? 'bg-blue-100 text-blue-900 border-blue-200'
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                }`}
                              >
                                {account.type === 'Activo' ? 'CAPEX' : 'OPEX'}
                              </span>
                            ) : (
                              <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-time Account and Area Breakdown */}
        <div className="space-y-6">
          {/* Asistencia Inteligente Info Box */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-700 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-indigo-950">
                  Asistencia Inteligente de Paola
                </h4>
                <p className="text-xs text-indigo-800">Motor de clasificación por palabras clave</p>
              </div>
            </div>
            <p className="text-xs text-indigo-950 leading-relaxed">
              El motor examina palabras clave (ej: <em>Notebook, Taladro, Mantención, Licencia, Disco Duro, Arriendo</em>) y sugiere la cuenta correspondiente. Puede presionar <strong>"Sugerir Cuentas Automáticamente"</strong> para clasificar en bloque y ajustar manualmente en cualquier momento.
            </p>
          </div>

          {/* Breakdown by Official Accounting Account */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Building2 className="w-5 h-5 text-blue-700" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Consolidado por Cuenta Contable
                </h3>
                <p className="text-xs text-slate-500">Plan de cuentas oficial de la Sede</p>
              </div>
            </div>

            <div className="space-y-4">
              {accountTotals.map((acc) => (
                <div key={acc.code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {acc.code} · {acc.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                        acc.type === 'Activo'
                          ? 'bg-blue-100 text-blue-900 border-blue-200'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                      }`}
                    >
                      {acc.type === 'Activo' ? 'CAPEX' : 'OPEX'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-xs text-slate-500 font-tabular">
                      {acc.itemCount} {acc.itemCount === 1 ? 'ítem' : 'ítems'} ({acc.percentage}%)
                    </span>
                    <span className="font-bold text-slate-900 font-tabular">
                      {formatCLP(acc.amount)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        acc.type === 'Activo' ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, acc.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown by TIC Area */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Layers className="w-5 h-5 text-indigo-700" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Consolidado por Área TIC
                </h3>
                <p className="text-xs text-slate-500">Sede Talca · Presupuesto 2026</p>
              </div>
            </div>

            <div className="space-y-3">
              {areaTotals.map((areaData) => {
                const areaStyle = AREA_CONFIG[areaData.area] || AREA_CONFIG['Salas Especiales'];
                return (
                  <div key={areaData.area} className="py-2 border-b border-slate-100 last:border-0 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${areaStyle.dot}`} />
                        <span className="font-bold text-slate-800">{areaData.area}</span>
                        <span className="text-xs text-slate-400 font-normal">({areaData.itemCount} ítems)</span>
                      </div>
                      <span className="font-bold text-slate-900 font-tabular">
                        {formatCLP(areaData.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-tabular">
                      <span>CAPEX: <strong className="text-blue-800">{formatCLP(areaData.capex)}</strong></span>
                      <span>OPEX: <strong className="text-emerald-800">{formatCLP(areaData.opex)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
