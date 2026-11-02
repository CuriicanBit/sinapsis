import React, { useState } from 'react';
import { Project, Role, ExecutionStatus, BitacoraEntry, Area, OFFICIAL_AREAS, OFFICIAL_TECHNICIANS } from '../types/budget';
import { formatCLP, MONTH_NAMES } from '../utils/formatters';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  PlusCircle, 
  FileText, 
  Search,
  Activity,
  History,
  X
} from 'lucide-react';

interface Stage5EjecucionControlProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  onAddProject: (project: Project) => void;
  currentRole: Role;
}

export const Stage5EjecucionControl: React.FC<Stage5EjecucionControlProps> = ({
  projects,
  onUpdateProject,
  onAddProject,
  currentRole,
}) => {
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Delay Bitacora Modal State (enforced when marked as 'Atrasado')
  const [bitacoraModalProject, setBitacoraModalProject] = useState<Project | null>(null);
  const [bitacoraReason, setBitacoraReason] = useState('');
  const [bitacoraCorrectiveAction, setBitacoraCorrectiveAction] = useState('');
  const [bitacoraResolutionDate, setBitacoraResolutionDate] = useState('');
  const [viewHistoryProject, setViewHistoryProject] = useState<Project | null>(null);

  // Extrapresupuestario Modal State
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraTitle, setExtraTitle] = useState('');
  const [extraArea, setExtraArea] = useState<Area>('Redes');
  const [extraResponsible, setExtraResponsible] = useState('Cristian');
  const [extraJustification, setExtraJustification] = useState('');
  const [extraAmount, setExtraAmount] = useState<number>(1850000);
  const [extraItemDesc, setExtraItemDesc] = useState('');

  // Global Execution Calculations
  const totalApproved = projects.reduce((sum, p) => sum + (p.approvedCeilingCLP ?? p.requestedBudgetCLP), 0);
  const totalExecuted = projects.reduce((sum, p) => sum + p.executedBudgetCLP, 0);
  const totalAvailable = Math.max(0, totalApproved - totalExecuted);
  const executionPercentage = totalApproved > 0 ? Math.round((totalExecuted / totalApproved) * 100) : 0;

  const atrasadosCount = projects.filter((p) => p.executionStatus === 'Atrasado').length;
  const enRiesgoCount = projects.filter((p) => p.executionStatus === 'En Riesgo').length;
  const completadosCount = projects.filter((p) => p.executionStatus === 'Completado').length;
  const extraCount = projects.filter((p) => p.isExtrapresupuestario).length;

  const filteredProjects = projects.filter((p) => {
    const matchMonth = filterMonth === 'all' || p.estimatedStartMonth === parseInt(filterMonth, 10);
    const matchStatus = filterStatus === 'all' || p.executionStatus === filterStatus;
    const matchSearch =
      searchTerm === '' ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.responsible.toLowerCase().includes(searchTerm.toLowerCase());
    return matchMonth && matchStatus && matchSearch;
  });

  // Handle Status Change with strict bitácora enforcement for 'Atrasado'
  const handleStatusChange = (project: Project, newStatus: ExecutionStatus) => {
    if (newStatus === 'Atrasado') {
      // Open modal to enforce bitácora logging before setting to Atrasado
      setBitacoraModalProject(project);
      setBitacoraReason('');
      setBitacoraCorrectiveAction('');
      setBitacoraResolutionDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    } else {
      let progress = project.progressPercentage;
      if (newStatus === 'Completado') {
        progress = 100;
      }
      onUpdateProject({
        ...project,
        executionStatus: newStatus,
        progressPercentage: progress,
      });
    }
  };

  // Submit Bitácora entry for delayed project
  const handleSaveBitacora = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bitacoraModalProject) return;

    if (!bitacoraReason.trim() || !bitacoraCorrectiveAction.trim() || !bitacoraResolutionDate) {
      alert('Debe completar el motivo del retraso, la acción correctiva y la fecha de resolución.');
      return;
    }

    const newEntry: BitacoraEntry = {
      id: `bita-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      reason: bitacoraReason.trim(),
      correctiveAction: bitacoraCorrectiveAction.trim(),
      expectedResolutionDate: bitacoraResolutionDate,
      author: currentRole === 'coordinador' ? 'Paola (Coordinadora TIC)' : 'Técnico Responsable',
      role: currentRole,
    };

    onUpdateProject({
      ...bitacoraModalProject,
      executionStatus: 'Atrasado',
      bitacora: [newEntry, ...bitacoraModalProject.bitacora],
    });

    setBitacoraModalProject(null);
  };

  // Update progress percentage and executed amount
  const handleProgressChange = (project: Project, newProgress: number) => {
    const validProgress = Math.min(100, Math.max(0, newProgress));
    const ceiling = project.approvedCeilingCLP ?? project.requestedBudgetCLP;
    const calculatedExecuted = Math.round((ceiling * validProgress) / 100);

    let status = project.executionStatus;
    if (validProgress === 100) {
      status = 'Completado';
    } else if (validProgress > 0 && status === 'No Iniciado') {
      status = 'En Plazo';
    }

    onUpdateProject({
      ...project,
      progressPercentage: validProgress,
      executedBudgetCLP: calculatedExecuted,
      executionStatus: status,
    });
  };

  const handleExecutedAmountChange = (project: Project, amount: number) => {
    const validAmount = Math.max(0, amount);
    const ceiling = project.approvedCeilingCLP ?? project.requestedBudgetCLP;
    const progress = ceiling > 0 ? Math.min(100, Math.round((validAmount / ceiling) * 100)) : 0;

    let status = project.executionStatus;
    if (progress === 100) {
      status = 'Completado';
    }

    onUpdateProject({
      ...project,
      executedBudgetCLP: validAmount,
      progressPercentage: progress,
      executionStatus: status,
    });
  };

  // Create Extrapresupuestario Project
  const handleCreateExtrapresupuestario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraTitle.trim() || !extraJustification.trim() || extraAmount <= 0) {
      alert('Por favor complete los datos obligatorios del proyecto extrapresupuestario.');
      return;
    }

    const extraProject: Project = {
      id: `proj-extra-${Date.now()}`,
      code: `TIC-TAL-2026-EXTRA-${String(extraCount + 1).padStart(2, '0')}`,
      title: extraTitle.trim(),
      area: extraArea,
      responsible: extraResponsible.trim(),
      estimatedStartMonth: new Date().getMonth() + 1,
      justification: extraJustification.trim(),
      reviewStatus: 'Aprobado',
      directorNotes: 'Proyecto Extrapresupuestario por contingencia aprobado por Dirección TIC.',
      items: [
        {
          id: `item-extra-${Date.now()}`,
          description: extraItemDesc.trim() || extraTitle.trim(),
          quantity: 1,
          unitPriceCLP: extraAmount,
          totalPriceCLP: extraAmount,
          accountCode: '1203105', // Default Redes / Equipos
        },
      ],
      requestedBudgetCLP: extraAmount,
      approvedCeilingCLP: extraAmount,
      executedBudgetCLP: 0,
      progressPercentage: 0,
      executionStatus: 'En Plazo',
      isExtrapresupuestario: true,
      bitacora: [],
    };

    onAddProject(extraProject);
    setIsExtraModalOpen(false);
    // Reset form
    setExtraTitle('');
    setExtraJustification('');
    setExtraItemDesc('');
    setExtraAmount(1500000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner Context */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#da291c] uppercase tracking-wider mb-1">
              <span>Etapa 5 de 5</span>
              <span>·</span>
              <span>Operación Anual & Monitoreo Mensual</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Ejecución, Control y Extrapresupuestarios (Todo el Equipo)
            </h2>
            <p className="text-base text-slate-600 mt-1 max-w-4xl">
              Seguimiento de la ejecución física y financiera mensual en Sede Talca. Si un proyecto se marca como <strong>Atrasado</strong>, el sistema exige de forma estricta registrar una bitácora con causa raíz y fecha de normalización. Permite registrar proyectos <strong>Extrapresupuestarios</strong> para contingencias.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsExtraModalOpen(true)}
              className="flex items-center gap-2 bg-[#da291c] hover:bg-[#b81e13] text-white font-bold px-5 py-3 rounded-lg shadow-md transition-all text-base cursor-pointer ring-1 ring-white/20"
              title="Registrar requerimiento imprevisto o contingencia con cargo a remanentes"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Proyecto Extrapresupuestario</span>
            </button>
          </div>
        </div>

        {/* 4 Financial Control Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Presupuesto Vigente Aprobado</p>
            <p className="text-2xl font-bold text-slate-900 font-tabular mt-1">
              {formatCLP(totalApproved)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Techo operativo anual</p>
          </div>

          <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900">Total Facturado / Ejecutado</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                {executionPercentage}%
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 font-tabular mt-1">
              {formatCLP(totalExecuted)}
            </p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-700 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, executionPercentage)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <p className="text-sm font-medium text-emerald-900">Saldo Remanente Disponible</p>
            <p className="text-2xl font-bold text-emerald-900 font-tabular mt-1">
              {formatCLP(totalAvailable)}
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Fondo libre para contingencias o remanentes
            </p>
          </div>

          <div
            className={`p-4 rounded-lg border ${
              atrasadosCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Estado de Proyectos</p>
              {atrasadosCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                  {atrasadosCount} Atrasados
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 mt-2 font-medium">
              <span className="text-emerald-700 font-bold">{completadosCount}</span> listos ·{' '}
              <span className="text-amber-700 font-bold">{enRiesgoCount}</span> en riesgo ·{' '}
              <span className="text-purple-700 font-bold">{extraCount}</span> extras
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Month Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar proyecto en ejecución..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Mes Inicio:</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 focus:bg-white"
            >
              <option value="all">Todo el Año</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Estado:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 focus:bg-white"
            >
              <option value="all">Todos</option>
              <option value="En Plazo">En Plazo</option>
              <option value="Atrasado">Atrasado</option>
              <option value="En Riesgo">En Riesgo</option>
              <option value="Completado">Completado</option>
              <option value="Pausado">Pausado</option>
              <option value="No Iniciado">No Iniciado</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-slate-500 font-medium">
          {filteredProjects.length} proyectos en seguimiento
        </div>
      </div>

      {/* Projects Execution Tracker Cards */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-lg font-medium text-slate-700">No hay proyectos para el filtro seleccionado.</p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const ceiling = project.approvedCeilingCLP ?? project.requestedBudgetCLP;
            const remaining = Math.max(0, ceiling - project.executedBudgetCLP);
            const isDelayed = project.executionStatus === 'Atrasado';

            return (
              <div
                key={project.id}
                className={`bg-white border rounded-xl p-5 shadow-xs transition-all ${
                  isDelayed
                    ? 'border-rose-300 bg-rose-50/20'
                    : project.executionStatus === 'Completado'
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left Column: Project Identity & Status */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                        {project.code}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {project.area}
                      </span>
                      <span className="text-xs text-slate-600">
                        Mes: <strong>{MONTH_NAMES[project.estimatedStartMonth - 1]} 2026</strong>
                      </span>
                      {project.isExtrapresupuestario && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                          Extrapresupuestario
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {project.title}
                    </h3>

                    <p className="text-xs text-slate-600">
                      Resp: <span className="font-semibold">{project.responsible}</span>
                    </p>

                    {/* Delay Alert Banner & Bitacora Trigger */}
                    {isDelayed && (
                      <div className="p-3 bg-rose-100/90 border border-rose-300 rounded-lg text-xs space-y-1.5 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <span>PROYECTO MARCADO COMO ATRASADO</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewHistoryProject(project)}
                            className="text-blue-800 hover:underline font-bold flex items-center gap-1"
                          >
                            <History className="w-3.5 h-3.5" />
                            Ver Bitácora ({project.bitacora.length})
                          </button>
                        </div>
                        {project.bitacora[0] && (
                          <div className="text-rose-900">
                            <p><strong>Causa:</strong> {project.bitacora[0].reason}</p>
                            <p><strong>Acción:</strong> {project.bitacora[0].correctiveAction}</p>
                            <p><strong>Fecha estimada resolución:</strong> {project.bitacora[0].expectedResolutionDate}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* View Bitacora button if has logs and not delayed */}
                    {!isDelayed && project.bitacora.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewHistoryProject(project)}
                        className="text-xs text-slate-600 hover:text-blue-700 font-semibold flex items-center gap-1 mt-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        Ver historial de bitácora ({project.bitacora.length})
                      </button>
                    )}
                  </div>

                  {/* Center Column: Financial Execution */}
                  <div className="shrink-0 lg:px-6 lg:border-x lg:border-slate-200 min-w-[240px] space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 font-medium">Presupuesto Vigente:</span>
                      <span className="text-sm font-bold font-tabular text-slate-800">
                        {formatCLP(ceiling)}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-blue-900 font-bold">Monto Ejecutado:</span>
                      <div className="w-32">
                        <input
                          type="number"
                          step="100000"
                          value={project.executedBudgetCLP}
                          onChange={(e) =>
                            handleExecutedAmountChange(project, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full p-1 text-sm font-bold font-tabular text-right border border-slate-300 rounded bg-white text-blue-900 focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Saldo por Ejecutar:</span>
                      <span className="text-sm font-bold font-tabular text-emerald-700">
                        {formatCLP(remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Execution Status & Progress Control */}
                  <div className="shrink-0 min-w-[280px] space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-700">Avance Físico del Proyecto:</span>
                        <span className="text-blue-900 font-bold font-tabular">
                          {project.progressPercentage}%
                        </span>
                      </div>

                      {/* Progress Range Slider */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={project.progressPercentage}
                        onChange={(e) =>
                          handleProgressChange(project, parseInt(e.target.value, 10))
                        }
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
                      />

                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <button type="button" onClick={() => handleProgressChange(project, 0)}>0%</button>
                        <button type="button" onClick={() => handleProgressChange(project, 25)}>25%</button>
                        <button type="button" onClick={() => handleProgressChange(project, 50)}>50%</button>
                        <button type="button" onClick={() => handleProgressChange(project, 75)}>75%</button>
                        <button type="button" onClick={() => handleProgressChange(project, 100)}>100%</button>
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Estado de Ejecución:
                      </label>
                      <select
                        value={project.executionStatus}
                        onChange={(e) =>
                          handleStatusChange(project, e.target.value as ExecutionStatus)
                        }
                        className={`w-full p-2 text-xs font-bold rounded-lg border transition-colors ${
                          isDelayed
                            ? 'bg-rose-100 border-rose-400 text-rose-900'
                            : project.executionStatus === 'Completado'
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                            : project.executionStatus === 'En Riesgo'
                            ? 'bg-amber-100 border-amber-400 text-amber-900'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="No Iniciado">No Iniciado</option>
                        <option value="En Plazo">En Plazo</option>
                        <option value="En Riesgo">En Riesgo</option>
                        <option value="Atrasado">⚠️ Atrasado (Exige Bitácora)</option>
                        <option value="Completado">✓ Completado</option>
                        <option value="Pausado">Pausado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mandatory Modal: Delay Bitácora Logging */}
      {bitacoraModalProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-rose-300 overflow-hidden">
            <div className="bg-rose-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-base font-bold">Registro Obligatorio de Bitácora por Atraso</h3>
                  <p className="text-xs text-rose-100">{bitacoraModalProject.code} · {bitacoraModalProject.title}</p>
                </div>
              </div>
              <button
                onClick={() => setBitacoraModalProject(null)}
                className="text-rose-200 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBitacora} className="p-6 space-y-4">
              <p className="text-sm text-slate-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
                La política de control institucional de la Universidad Autónoma exige registrar formalmente la causa raíz del retraso y las medidas de mitigación adoptadas para regularizar la entrega.
              </p>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Motivo / Causa Raíz del Retraso <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={bitacoraReason}
                  onChange={(e) => setBitacoraReason(e.target.value)}
                  placeholder="Ej: Quiebre de stock nacional en mayorista de hardware, paro aduanero o retraso de obras civiles..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Acción Correctiva Adoptada <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={bitacoraCorrectiveAction}
                  onChange={(e) => setBitacoraCorrectiveAction(e.target.value)}
                  placeholder="Ej: Se activó cotización con proveedor regional alternativo de Talca con despacho prioritario..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Nueva Fecha Estimada de Regularización <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={bitacoraResolutionDate}
                  onChange={(e) => setBitacoraResolutionDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setBitacoraModalProject(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm"
                >
                  Guardar Bitácora y Marcar Atrasado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Bitácora History */}
      {viewHistoryProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Historial de Bitácora y Justificaciones</h3>
                <p className="text-xs text-slate-400">{viewHistoryProject.code} · {viewHistoryProject.title}</p>
              </div>
              <button
                onClick={() => setViewHistoryProject(null)}
                className="text-slate-400 hover:text-white p-1 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {viewHistoryProject.bitacora.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No hay entradas registradas en la bitácora de este proyecto.</p>
              ) : (
                viewHistoryProject.bitacora.map((entry) => (
                  <div key={entry.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-200">
                      <span className="font-semibold text-slate-700">Fecha de Registro: {entry.date}</span>
                      <span>Registrado por: <strong>{entry.author}</strong></span>
                    </div>
                    <div className="text-sm text-slate-800">
                      <p className="font-bold text-rose-900">Motivo del Retraso:</p>
                      <p className="mt-0.5">{entry.reason}</p>
                    </div>
                    <div className="text-sm text-slate-800">
                      <p className="font-bold text-blue-900">Acción Correctiva:</p>
                      <p className="mt-0.5">{entry.correctiveAction}</p>
                    </div>
                    <div className="text-xs font-semibold text-emerald-800 pt-1">
                      Fecha Estimada de Solución: {entry.expectedResolutionDate}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-100 flex justify-end">
              <button
                onClick={() => setViewHistoryProject(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Proyecto Extrapresupuestario */}
      {isExtraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-purple-300 overflow-hidden">
            <div className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Registrar Proyecto Extrapresupuestario</h3>
                <p className="text-xs text-purple-200">Contingencia o Asignación Extraordinaria con Remanentes</p>
              </div>
              <button
                onClick={() => setIsExtraModalOpen(false)}
                className="text-purple-300 hover:text-white p-1 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExtrapresupuestario} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Nombre del Proyecto de Contingencia <span className="text-purple-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={extraTitle}
                  onChange={(e) => setExtraTitle(e.target.value)}
                  placeholder="Ej: Reemplazo Urgente de UPS Edificio Aulario Central"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Área TIC
                  </label>
                  <select
                    value={extraArea}
                    onChange={(e) => setExtraArea(e.target.value as Area)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                  >
                    {OFFICIAL_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Monto Requerido (CLP) <span className="text-purple-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="50000"
                    value={extraAmount}
                    onChange={(e) => setExtraAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold font-tabular text-purple-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Responsable Técnico Oficial
                </label>
                <select
                  required
                  value={extraResponsible}
                  onChange={(e) => setExtraResponsible(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                >
                  {OFFICIAL_TECHNICIANS.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech} (Técnico TIC)
                    </option>
                  ))}
                  <option value="Paola">Paola (Coordinadora TIC)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Justificación de Urgencia / Contingencia <span className="text-purple-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={extraJustification}
                  onChange={(e) => setExtraJustification(e.target.value)}
                  placeholder="Detalle la contingencia operativa no prevista, impacto en la continuidad docente y justificación del uso de saldos de remanente..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsExtraModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm"
                >
                  Aprobar Proyecto Extrapresupuestario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
