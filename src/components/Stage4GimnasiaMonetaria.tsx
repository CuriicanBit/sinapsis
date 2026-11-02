import React, { useState, useEffect } from 'react';
import { Project, Role, Area, AreaTransfer, BudgetItem } from '../types/budget';
import { formatCLP, MONTH_NAMES, AREA_CONFIG, OFFICIAL_ACCOUNTS, getAccountByCode } from '../utils/formatters';
import { 
  getApreRecords, 
  saveApreRecords, 
  getAreaTransfers, 
  saveAreaTransfers, 
  calculateAccountBalances, 
  evaluateProjectFinancing, 
  authorizeProjectPlay,
  ProjectFinancingEvaluation,
  AccountBalanceInfo
} from '../utils/apreEngine';
import { isSupabaseConfigured } from '../lib/supabase';
import { 
  fetchApreRecordsFromDatabase, 
  saveApreRecordsToDatabase, 
  saveAreaTransferToDatabase, 
  deleteAreaTransferFromDatabase, 
  fetchAreaTransfersFromDatabase 
} from '../services/supabaseService';
import { 
  Play, 
  Pause, 
  ArrowRightLeft, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  TrendingUp, 
  Scale, 
  Search, 
  Filter, 
  FolderDown, 
  RotateCcw, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  X, 
  Check, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Coins
} from 'lucide-react';

interface Stage4GimnasiaMonetariaProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  currentRole: Role;
  onGoToNextStage: () => void;
}

export const Stage4GimnasiaMonetaria: React.FC<Stage4GimnasiaMonetariaProps> = ({
  projects,
  onUpdateProject,
  currentRole,
  onGoToNextStage,
}) => {
  // 1. APRE Records and Transfers state
  const [apreRecords, setApreRecords] = useState(() => getApreRecords());
  const [transfers, setTransfers] = useState<AreaTransfer[]>(() => getAreaTransfers());

  // Load from Supabase on mount if configured
  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchApreRecordsFromDatabase().then((dbApre) => {
        if (dbApre && dbApre.length > 0) {
          setApreRecords(dbApre);
        }
      });

      fetchAreaTransfersFromDatabase().then((dbTransfers) => {
        if (dbTransfers && dbTransfers.length > 0) {
          setTransfers(dbTransfers);
        }
      });
    }
  }, []);

  // Filter and Search states
  const [filterStatus, setFilterStatus] = useState<'all' | 'financed' | 'blocked' | 'paused' | 'running'>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Notification Toast
  const [notification, setNotification] = useState<string | null>(null);

  // Modals state
  // Modal 1: Transfer balance between areas
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAccountCode, setTransferAccountCode] = useState<string>('1203102');
  const [transferSourceArea, setTransferSourceArea] = useState<Area>('Redes');
  const [transferTargetArea, setTransferTargetArea] = useState<Area>('Salas de Clases');
  const [transferAmount, setTransferAmount] = useState<number>(1500000);
  const [transferReason, setTransferReason] = useState<string>('');

  // Modal 2: Reajustar ítem
  const [reajustItemProject, setReajustItemProject] = useState<Project | null>(null);
  const [reajustItem, setReajustItem] = useState<BudgetItem | null>(null);
  const [reajustQty, setReajustQty] = useState<number>(1);
  const [reajustPrice, setReajustPrice] = useState<number>(0);
  const [reajustDesc, setReajustDesc] = useState<string>('');

  // Modal 3: Confirm Play / Authorization
  const [playConfirmProject, setPlayConfirmProject] = useState<Project | null>(null);

  // Recalculate account balances when apreRecords, transfers or projects change
  const accountBalances = calculateAccountBalances(apreRecords, transfers, projects);

  // Evaluate all projects against APRE balances
  const evaluationsMap = new Map<string, ProjectFinancingEvaluation>();
  projects.forEach((proj) => {
    evaluationsMap.set(proj.id, evaluateProjectFinancing(proj, accountBalances));
  });

  // Calculate master summary statistics
  let totalInCartera = 0;
  let totalFinanciadosCount = 0;
  let totalBloqueadosCount = 0;
  let totalPausadosCount = 0;
  let totalRunningCount = 0;
  let totalGapAllProjects = 0;
  let totalApreAvailableSaldo = 0;

  accountBalances.forEach((acc) => {
    totalApreAvailableSaldo += acc.availableBalance;
  });

  projects.forEach((proj) => {
    const isPaused = proj.executionStatus === 'Pausado' || proj.pausedInPostCut;
    const isRunning = proj.executionStatus === 'En Plazo' || proj.executionStatus === 'Completado';
    const evalData = evaluationsMap.get(proj.id);

    if (isPaused) {
      totalPausadosCount++;
    } else if (isRunning) {
      totalRunningCount++;
    } else {
      totalInCartera++;
      if (evalData?.isFinanced) {
        totalFinanciadosCount++;
      } else {
        totalBloqueadosCount++;
        totalGapAllProjects += evalData?.totalGapCLP || 0;
      }
    }
  });

  // Trigger Notification
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  // Filter projects for display
  const filteredProjects = projects.filter((proj) => {
    const isPaused = proj.executionStatus === 'Pausado' || proj.pausedInPostCut;
    const isRunning = proj.executionStatus === 'En Plazo' || proj.executionStatus === 'Completado';
    const evalData = evaluationsMap.get(proj.id);

    // Status filter
    if (filterStatus === 'financed' && (!evalData?.isFinanced || isPaused || isRunning)) return false;
    if (filterStatus === 'blocked' && (evalData?.isFinanced || isPaused || isRunning)) return false;
    if (filterStatus === 'paused' && !isPaused) return false;
    if (filterStatus === 'running' && !isRunning) return false;

    // Area filter
    if (filterArea !== 'all' && proj.area !== filterArea) return false;

    // Search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchCode = proj.code.toLowerCase().includes(term);
      const matchTitle = proj.title.toLowerCase().includes(term);
      const matchResp = proj.responsible.toLowerCase().includes(term);
      if (!matchCode && !matchTitle && !matchResp) return false;
    }

    return true;
  });

  // Auto-expand first project only on initial load, allowing user to collapse freely
  const hasAutoExpandedRef = React.useRef(false);
  useEffect(() => {
    if (!hasAutoExpandedRef.current && filteredProjects.length > 0) {
      setExpandedProjectId(filteredProjects[0].id);
      hasAutoExpandedRef.current = true;
    }
  }, [filteredProjects]);

  // Handler: Execute Area Transfer ("Magia Financiera 1")
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferSourceArea === transferTargetArea) {
      alert('El área de origen y el área de destino deben ser diferentes.');
      return;
    }
    if (transferAmount <= 0) {
      alert('El monto a transferir debe ser mayor a $ 0.');
      return;
    }

    const newTransfer: AreaTransfer = {
      id: `trans-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      accountCode: transferAccountCode,
      sourceArea: transferSourceArea,
      targetArea: transferTargetArea,
      amountCLP: transferAmount,
      reason: transferReason.trim() || 'Reasignación de remanente presupuestario para cobertura de brecha.',
      author: currentRole === 'director' ? 'Director TIC' : 'Paola (Coordinadora TIC)',
    };

    const nextTransfers = [newTransfer, ...transfers];
    setTransfers(nextTransfers);
    saveAreaTransfers(nextTransfers);

    if (isSupabaseConfigured()) {
      await saveAreaTransferToDatabase(newTransfer);
    }

    setIsTransferModalOpen(false);
    setTransferReason('');
    triggerNotification(
      `Traspaso realizado con éxito: ${formatCLP(transferAmount)} transferidos de ${transferSourceArea} a ${transferTargetArea}.`
    );
  };

  // Handler: Revert an Area Transfer
  const handleUndoTransfer = async (transferId: string) => {
    const nextTransfers = transfers.filter((t) => t.id !== transferId);
    setTransfers(nextTransfers);
    saveAreaTransfers(nextTransfers);

    if (isSupabaseConfigured()) {
      await deleteAreaTransferFromDatabase(transferId);
    }

    triggerNotification('Traspaso presupuestario revertido exitosamente.');
  };

  // Handler: Open Item Reajust Modal ("Magia Financiera 2")
  const handleOpenReajustItem = (project: Project, item: BudgetItem) => {
    setReajustItemProject(project);
    setReajustItem(item);
    setReajustDesc(item.description);
    setReajustQty(item.quantity);
    setReajustPrice(item.unitPriceCLP);
  };

  // Handler: Fit Item Exactly to Available Balance
  const handleFitItemToAvailable = () => {
    if (!reajustItem) return;
    const code = reajustItem.accountCode || '1203102';
    const acc = accountBalances.get(code);
    const available = acc ? acc.availableBalance : 0;

    if (available <= 0) {
      alert(`La cuenta ${code} no tiene saldo disponible en APRE para calzar.`);
      return;
    }

    // Set unit price so that qty * price = available
    const newPrice = Math.floor(available / Math.max(1, reajustQty));
    setReajustPrice(newPrice);
    triggerNotification(`Costo unitario recalculado a ${formatCLP(newPrice)} para calzar exactamente con saldo APRE.`);
  };

  // Handler: Save Reajusted Item
  const handleSaveReajustItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reajustItemProject || !reajustItem) return;

    const qty = Math.max(1, reajustQty);
    const price = Math.max(0, reajustPrice);
    const updatedTotalPrice = qty * price;

    const updatedItems = reajustItemProject.items.map((it) => {
      if (it.id === reajustItem.id) {
        return {
          ...it,
          description: reajustDesc.trim() || it.description,
          quantity: qty,
          unitPriceCLP: price,
          totalPriceCLP: updatedTotalPrice,
        };
      }
      return it;
    });

    const newProjectTotal = updatedItems.reduce((sum, it) => sum + it.totalPriceCLP, 0);

    const updatedProj: Project = {
      ...reajustItemProject,
      items: updatedItems,
      requestedBudgetCLP: newProjectTotal,
      approvedCeilingCLP: newProjectTotal,
      directorNotes: (reajustItemProject.directorNotes ? reajustItemProject.directorNotes + ' · ' : '') +
        `Reajuste de ítem "${reajustItem.description.slice(0, 20)}..." a ${formatCLP(updatedTotalPrice)}.`,
    };

    onUpdateProject(updatedProj);
    setReajustItemProject(null);
    setReajustItem(null);
    triggerNotification(`Ítem reajustado con éxito. Nuevo subtotal: ${formatCLP(updatedTotalPrice)}.`);
  };

  // Handler: Toggle Pausing / Deferring to 2nd Semester ("Magia Financiera 3")
  const handleToggleDeferProject = (project: Project) => {
    const isNowPaused = !(project.executionStatus === 'Pausado' || project.pausedInPostCut);
    const updatedProj: Project = {
      ...project,
      pausedInPostCut: isNowPaused,
      executionStatus: isNowPaused ? 'Pausado' : 'No Iniciado',
      directorNotes: (project.directorNotes ? project.directorNotes + ' · ' : '') +
        (isNowPaused 
          ? 'Proyecto diferido a carpeta del 2º Semestre para liberar saldo en APRE.' 
          : 'Proyecto reactivado en cartera activa.'),
    };

    onUpdateProject(updatedProj);
    triggerNotification(
      isNowPaused
        ? `Proyecto ${project.code} diferido al 2º Semestre. Se liberaron ${formatCLP(project.requestedBudgetCLP)} en sus cuentas.`
        : `Proyecto ${project.code} reactivado en la Bolsa activa del 1er Semestre.`
    );
  };

  // Handler: Execute Play Authorization ("🚀 DAR PLAY")
  const handleConfirmPlay = async () => {
    if (!playConfirmProject) return;

    const { updatedRecords, updatedProject } = authorizeProjectPlay(playConfirmProject, apreRecords);
    setApreRecords(updatedRecords);
    onUpdateProject(updatedProject);

    if (isSupabaseConfigured()) {
      await saveApreRecordsToDatabase(updatedRecords);
    }

    const projectTitle = playConfirmProject.title;
    const projectCode = playConfirmProject.code;
    setPlayConfirmProject(null);

    triggerNotification(
      `🚀 ¡Proyecto ${projectCode} autorizado e iniciado exitosamente! Saldo descontado de APRE y guardado en Supabase. Pasando a Etapa 5.`
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-4 bg-[#000000] text-white text-base font-bold rounded-xl shadow-xl border-2 border-[#da291c] flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#ff6900] shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[#d2d2d2] hover:text-white px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Context Header */}
      <section aria-label="Bolsa de Proyectos y Readecuación Presupuestaria" className="bg-white border border-[#d2d2d2] rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#da291c] uppercase tracking-wider mb-1">
              <span>Etapa 4 de 5</span>
              <span>·</span>
              <span>Bolsa de Proyectos y Readecuación Presupuestaria</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Bolsa de Proyectos y Readecuación Presupuestaria (Director + Paola)
            </h2>
            <p className="text-base text-slate-600 mt-1 max-w-4xl leading-relaxed">
              Cruce automatizado ítem por ítem con los saldos oficiales de la plataforma APRE (Etapa 3). Evalúe proyectos en carpeta, aplique readecuaciones financieras (transferencias entre áreas, reajuste de ítems o diferimiento al 2º semestre) y presione <strong>"🚀 Iniciar Ejecución"</strong> para autorizar fondos y dar paso a la ejecución técnica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Quick Action: Transfer Balance between Areas */}
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-2 bg-[#ff6900] hover:bg-[#e05c00] text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-base cursor-pointer"
              title="Mover sobrantes de saldo entre áreas en una misma cuenta contable"
            >
              <ArrowRightLeft className="w-4 h-4 text-white" />
              <span>Transferir Saldo entre Áreas</span>
            </button>

            {/* Quick Jump to Stage 5 */}
            <button
              onClick={onGoToNextStage}
              className="flex items-center gap-2 bg-[#da291c] hover:bg-[#b81e13] text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-colors text-base cursor-pointer ring-1 ring-white/20"
            >
              <span>Ir a Etapa 5 (Ejecución Técnica)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5 Real-Time KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
              Proyectos en Cartera
            </span>
            <span className="text-2xl font-bold text-slate-900 font-tabular mt-1 block">
              {totalInCartera}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Pendientes de inicio
            </span>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                🟢 Financiados
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-2xl font-bold text-emerald-900 font-tabular mt-1 block">
              {totalFinanciadosCount}
            </span>
            <span className="text-xs text-emerald-700 font-semibold mt-0.5 block">
              Listos para Dar PLAY 🚀
            </span>
          </div>

          <div className="p-4 bg-rose-50 rounded-xl border border-rose-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                🔴 Sin Financiamiento
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            </div>
            <span className="text-2xl font-bold text-rose-900 font-tabular mt-1 block">
              {totalBloqueadosCount}
            </span>
            <span className="text-xs text-rose-700 font-semibold mt-0.5 block">
              Requieren Readecuación
            </span>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-300">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide block">
              ⏸️ Diferidos (2º Sem)
            </span>
            <span className="text-2xl font-bold text-amber-900 font-tabular mt-1 block">
              {totalPausadosCount}
            </span>
            <span className="text-xs text-amber-700 mt-0.5 block">
              Liberan saldo APRE
            </span>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-300">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wide block">
              Saldo Disponible APRE
            </span>
            <span className="text-xl font-bold text-blue-950 font-tabular mt-1 block">
              {formatCLP(totalApreAvailableSaldo)}
            </span>
            <span className="text-xs text-blue-700 mt-0.5 block">
              Consolidado Sede Talca
            </span>
          </div>
        </div>

        {/* Global Deficit Alert Banner if blocked projects exist */}
        {totalBloqueadosCount > 0 && (
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-base font-bold text-rose-950">
                  {totalBloqueadosCount} {totalBloqueadosCount === 1 ? 'Proyecto presenta' : 'Proyectos presentan'} brecha presupuestaria frente a los saldos vigentes en APRE
                </h4>
                <p className="text-sm text-rose-800 mt-0.5">
                  Brecha total acumulada: <strong className="font-tabular text-rose-950">{formatCLP(totalGapAllProjects)}</strong>. Utilice las herramientas de readecuación: traspase saldos entre áreas, reajuste las cantidades o difiera proyectos prescindibles.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-sm transition-colors whitespace-nowrap cursor-pointer shrink-0 shadow-xs"
            >
              Readecuar Saldos Ahora
            </button>
          </div>
        )}
      </section>

      {/* Filter Toolbar: Status tabs, Area, and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-[#0F294A] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos ({projects.length})
          </button>
          <button
            onClick={() => setFilterStatus('financed')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'financed'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>🟢 Financiados ({totalFinanciadosCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('blocked')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'blocked'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>🔴 Sin Financiamiento ({totalBloqueadosCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('paused')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'paused'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
            }`}
          >
            <Pause className="w-3.5 h-3.5 text-amber-600" />
            <span>⏸️ Diferidos 2º Sem ({totalPausadosCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('running')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterStatus === 'running'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-900 border border-blue-300 hover:bg-blue-100'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-blue-600" />
            <span>🚀 Ya Autorizados ({totalRunningCount})</span>
          </button>
        </div>

        {/* Area Filter and Search Box */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Área TIC:</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-semibold focus:bg-white"
            >
              <option value="all">Todas las Áreas</option>
              {['Usuarios', 'Laboratorios', 'Salas de Clases', 'Redes', 'Salones de Eventos', 'Salas Especiales', 'CCTV'].map(
                (area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, título o técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Projects List */}
      <div className="space-y-5">
        {filteredProjects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-lg font-bold text-slate-700">
              No se encontraron proyectos con los filtros seleccionados.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Pruebe cambiando el filtro de financiamiento o el área TIC.
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            const evalData = evaluationsMap.get(project.id);
            const isFinanced = evalData?.isFinanced ?? false;
            const isPaused = project.executionStatus === 'Pausado' || project.pausedInPostCut;
            const isRunning = project.executionStatus === 'En Plazo' || project.executionStatus === 'Completado';
            const areaStyle = AREA_CONFIG[project.area] || AREA_CONFIG['Salas Especiales'];

            return (
              <div
                key={project.id}
                className={`bg-white border rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all border-l-4 ${
                  isRunning 
                    ? 'border-l-blue-600'
                    : isPaused 
                    ? 'border-l-amber-500 opacity-90'
                    : isFinanced 
                    ? 'border-l-emerald-500' 
                    : 'border-l-rose-500'
                }`}
              >
                {/* Project Header Bar */}
                <div
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer bg-slate-50/60 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Contraer proyecto' : 'Expandir proyecto'}
                      className="p-1.5 text-slate-500 hover:text-slate-800 bg-white rounded border border-slate-200 shrink-0 mt-0.5 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                          {project.code}
                        </span>

                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${areaStyle.badge}`}>
                          <span className={`w-2 h-2 rounded-full ${areaStyle.dot}`} />
                          <span>{project.area}</span>
                        </span>

                        <span className="text-xs text-slate-600 font-medium">
                          Mes Estimado: <strong>{MONTH_NAMES[project.estimatedStartMonth - 1]} 2026</strong>
                        </span>

                        <span className="text-xs text-slate-400">·</span>

                        <span className="text-xs text-slate-600 font-medium">
                          Responsable: <strong>{project.responsible}</strong>
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 leading-snug">
                        {project.title}
                      </h3>
                    </div>
                  </div>

                  {/* Financial Status & Action Trigger Button */}
                  <div className="flex flex-wrap items-center gap-4 shrink-0 md:pl-4 md:border-l md:border-slate-200">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500 block">
                        Costo Total Proyecto
                      </span>
                      <span className="text-xl font-extrabold font-tabular text-slate-900 block">
                        {formatCLP(project.requestedBudgetCLP)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {project.items.length} {project.items.length === 1 ? 'ítem' : 'ítems'}
                      </span>
                    </div>

                    {/* Prominent Visual Financing Status Badge */}
                    <div className="shrink-0">
                      {isRunning ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-900 font-bold text-sm border border-blue-300">
                          <CheckCircle2 className="w-4 h-4 text-blue-700" />
                          <span>🚀 En Ejecución (Play Activo)</span>
                        </span>
                      ) : isPaused ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-950 font-bold text-sm border border-amber-300">
                          <Pause className="w-4 h-4 text-amber-700" />
                          <span>⏸️ Diferido 2º Semestre</span>
                        </span>
                      ) : isFinanced ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-950 font-bold text-sm border border-emerald-300 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>🟢 FINANCIADO</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-100 text-rose-950 font-bold text-sm border border-rose-300 shadow-2xs">
                          <AlertTriangle className="w-4 h-4 text-rose-700" />
                          <span>🔴 SIN FINANCIAMIENTO</span>
                        </span>
                      )}
                    </div>

                    {/* PLAY BUTTON (Only if Financed) or Defer/Reactivate Button */}
                    <div className="flex items-center gap-2">
                      {isFinanced && !isRunning && !isPaused && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayConfirmProject(project);
                          }}
                          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all text-sm cursor-pointer ring-2 ring-emerald-500/50"
                          title="Autorizar fondos en APRE e iniciar ejecución técnica"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>🚀 Iniciar Ejecución</span>
                        </button>
                      )}

                      {/* Defer or Reactivate Project */}
                      {!isRunning && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDeferProject(project);
                          }}
                          className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                            isPaused
                              ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                          title={isPaused ? 'Reactivar en 1er Semestre' : 'Diferir al 2º Semestre para liberar saldo'}
                        >
                          {isPaused ? '▶️ Reactivar' : '⏸️ Diferir'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Card Details: Deficit Breakdown and Items Evaluation */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-200 space-y-6">
                    {/* Botlleneck Alert Box if Sin Financiamiento */}
                    {!isFinanced && !isPaused && evalData?.bottlenecks && evalData.bottlenecks.length > 0 && (
                      <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-rose-900 font-bold text-base">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>Detalle de Brecha Presupuestaria frente a Cuentas APRE</span>
                        </div>
                        <div className="space-y-2">
                          {evalData.bottlenecks.map((b) => (
                            <div
                              key={b.accountCode}
                              className="p-3 bg-white rounded-lg border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                            >
                              <div>
                                <span className="font-bold text-slate-900">
                                  Cuenta {b.accountCode} · {b.accountName}
                                </span>
                                <div className="text-xs text-slate-600 font-medium mt-0.5">
                                  Requerido para este proyecto: <strong className="font-tabular">{formatCLP(b.requiredCLP)}</strong> | Saldo Disponible en APRE: <strong className="font-tabular">{formatCLP(b.availableCLP)}</strong>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-rose-700 font-semibold block">Déficit / Brecha:</span>
                                <span className="text-base font-extrabold text-rose-700 font-tabular block">
                                  -{formatCLP(b.deficitCLP)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const firstBottleneck = evalData.bottlenecks[0];
                              setTransferAccountCode(firstBottleneck.accountCode);
                              setTransferTargetArea(project.area);
                              setTransferAmount(firstBottleneck.deficitCLP);
                              setIsTransferModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-300" />
                            <span>Transferir Saldo desde otra Área a {project.area}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Justification Box */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">
                        Justificación Técnica Institucional:
                      </span>
                      <p className="text-base text-slate-700 leading-relaxed">
                        {project.justification}
                      </p>
                    </div>

                    {/* Items Table with Account and APRE Coverage Check */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-base font-bold text-slate-900">
                          Desglose de Ítems, Cuentas Contables y Saldo APRE
                        </h4>
                        <span className="text-xs text-slate-500 font-medium">
                          Evaluado en tiempo real contra registros APRE 2026
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase">
                            <tr>
                              <th className="py-3 px-3">Descripción del Ítem</th>
                              <th className="py-3 px-3 text-center w-16">Cant</th>
                              <th className="py-3 px-3 text-right w-28">Subtotal CLP</th>
                              <th className="py-3 px-3 min-w-[280px]">Cuenta Contable Asignada</th>
                              <th className="py-3 px-3 text-right w-36">Saldo Disp. APRE</th>
                              <th className="py-3 px-3 text-center w-36">Cobertura</th>
                              <th className="py-3 px-3 text-center w-28">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-xs">
                            {evalData?.itemsEvaluation.map(({ item, accountCode, accountName, itemCost, availableAccountBalance, isCovered, gapCLP }) => {
                              return (
                                <tr key={item.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-3 align-middle">
                                    <p className="font-bold text-slate-900 text-base leading-snug">
                                      {item.description}
                                    </p>
                                    <p className="text-xs text-slate-500 font-tabular mt-0.5">
                                      Costo Unitario: {formatCLP(item.unitPriceCLP)}
                                    </p>
                                  </td>

                                  <td className="py-3 px-3 align-middle text-center font-tabular font-bold text-slate-800 text-base">
                                    {item.quantity}
                                  </td>

                                  <td className="py-3 px-3 align-middle text-right font-tabular font-bold text-slate-900 whitespace-nowrap text-base">
                                    {formatCLP(itemCost)}
                                  </td>

                                  <td className="py-3 px-3 align-middle">
                                    <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mr-1.5">
                                      {accountCode}
                                    </span>
                                    <span className="font-semibold text-slate-800 text-xs">
                                      {accountName}
                                    </span>
                                  </td>

                                  <td className="py-3 px-3 align-middle text-right font-tabular font-bold text-slate-800 whitespace-nowrap text-sm">
                                    {formatCLP(availableAccountBalance)}
                                  </td>

                                  <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                                    {isCovered ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300">
                                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                                        <span>Cubierto</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 text-rose-900 font-bold text-xs border border-rose-300" title={`Faltan ${formatCLP(gapCLP)} en la cuenta ${accountCode}`}>
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                                        <span>Déficit -{formatCLP(gapCLP)}</span>
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-3 align-middle text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReajustItem(project, item)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-900 border border-slate-300 hover:border-blue-400 rounded-md text-xs font-bold transition-colors cursor-pointer"
                                      title="Modificar cantidad o valor unitario para calzar con saldo APRE"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Reajustar</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Inter-Area Transfer History Panel if any transfer was made */}
      {transfers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-700" />
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Historial de Traspasos de Saldo entre Áreas
                </h4>
                <p className="text-xs text-slate-500">
                  Reasignaciones presupuestarias ejecutadas para resolver proyectos bloqueados
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              {transfers.length} {transfers.length === 1 ? 'traspaso' : 'traspasos'}
            </span>
          </div>

          <div className="space-y-2">
            {transfers.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Cuenta {t.accountCode} · {getAccountByCode(t.accountCode)?.name || t.accountCode}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{t.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Desde: <strong>{t.sourceArea}</strong> → Hacia: <strong>{t.targetArea}</strong> | Motivo: <em>"{t.reason}"</em>
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-base font-extrabold font-tabular text-indigo-900">
                    {formatCLP(t.amountCLP)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUndoTransfer(t.id)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 px-2.5 py-1 rounded border border-rose-300 transition-colors cursor-pointer"
                  >
                    Deshacer Traspaso
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Transferir Saldo entre Áreas */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-indigo-200 overflow-hidden animate-fade-in">
            <div className="bg-[#0F294A] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="w-5 h-5 text-amber-300" />
                <h3 className="text-lg font-bold">Transferir Saldo Presupuestario entre Áreas</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Mueva excedentes presupuestarios de un área con holgura a otra con déficit dentro de la misma cuenta contable institucional, permitiendo desbloquear proyectos prioritarios.
              </p>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Cuenta Contable Oficial <span className="text-rose-600">*</span>
                </label>
                <select
                  value={transferAccountCode}
                  onChange={(e) => setTransferAccountCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:bg-white"
                >
                  {OFFICIAL_ACCOUNTS.map((acc) => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} - {acc.name} ({acc.categoryLabel || (acc.type === 'Activo' ? 'Inversión' : 'Operación')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Área Origen (Cede Saldo) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={transferSourceArea}
                    onChange={(e) => setTransferSourceArea(e.target.value as Area)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:bg-white"
                  >
                    {['Usuarios', 'Laboratorios', 'Salas de Clases', 'Redes', 'Salones de Eventos', 'Salas Especiales', 'CCTV'].map(
                      (area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Área Destino (Recibe Saldo) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={transferTargetArea}
                    onChange={(e) => setTransferTargetArea(e.target.value as Area)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:bg-white"
                  >
                    {['Usuarios', 'Laboratorios', 'Salas de Clases', 'Redes', 'Salones de Eventos', 'Salas Especiales', 'CCTV'].map(
                      (area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Monto a Transferir en CLP ($) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="50000"
                  step="50000"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold font-tabular text-slate-900 focus:bg-white"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  Equivalente: <strong>{formatCLP(transferAmount)}</strong>
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Justificación de Readecuación <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ej: Traspaso de excedente en cableado de Redes para financiar cámaras CCTV requeridas por seguridad..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm transition-colors cursor-pointer"
                >
                  Efectuar Traspaso de Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reajustar Ítem */}
      {reajustItemProject && reajustItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-[#d2d2d2] overflow-hidden animate-fade-in">
            <div className="bg-[#000000] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#da291c]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#ff6900]" />
                <h3 className="text-lg font-bold">Reajustar Ítem Presupuestario</h3>
              </div>
              <button
                type="button"
                onClick={() => setReajustItem(null)}
                className="text-[#d2d2d2] hover:text-white p-1 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReajustItem} className="p-6 space-y-4">
              <div>
                <span className="text-xs text-slate-500 font-semibold block">Proyecto:</span>
                <span className="text-sm font-bold text-slate-800 block">
                  {reajustItemProject.code} · {reajustItemProject.title}
                </span>
                <span className="text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-mono font-bold mt-1 inline-block">
                  Cuenta: {reajustItem.accountCode || '1203102'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Descripción del Ítem <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reajustDesc}
                  onChange={(e) => setReajustDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Cantidad <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={reajustQty}
                    onChange={(e) => setReajustQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold font-tabular text-slate-900 text-center focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Valor Unitario CLP ($) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={reajustPrice}
                    onChange={(e) => setReajustPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base font-bold font-tabular text-slate-900 text-right focus:bg-white"
                  />
                </div>
              </div>

              {/* Subtotal preview & 1-click Fit button */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-blue-900 font-bold block">Nuevo Subtotal:</span>
                  <span className="text-lg font-extrabold text-blue-950 font-tabular">
                    {formatCLP(reajustQty * reajustPrice)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleFitItemToAvailable}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-md shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Calcular precio unitario para calzar exactamente con el saldo disponible en APRE"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Calzar con Saldo APRE</span>
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setReajustItem(null)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-[#da291c] hover:bg-[#b81e13] text-white shadow-sm transition-colors cursor-pointer"
                >
                  Guardar Reajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmación de Autorización "🚀 DAR PLAY" */}
      {playConfirmProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-emerald-300 overflow-hidden animate-fade-in">
            <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Play className="w-5 h-5 fill-white text-white" />
                <h3 className="text-lg font-bold">Autorizar e Iniciar Proyecto TIC</h3>
              </div>
              <button
                type="button"
                onClick={() => setPlayConfirmProject(null)}
                className="text-emerald-200 hover:text-white p-1 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
                <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-200 px-2 py-0.5 rounded">
                  {playConfirmProject.code}
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {playConfirmProject.title}
                </h4>
                <p className="text-sm font-semibold text-slate-700">
                  Responsable Técnico: <strong>{playConfirmProject.responsible}</strong>
                </p>
                <p className="text-lg font-extrabold text-emerald-900 font-tabular mt-2">
                  Monto a descontar de APRE: {formatCLP(playConfirmProject.requestedBudgetCLP)}
                </p>
              </div>

              <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    El proyecto cumple 100% con saldo disponible en sus cuentas oficiales de APRE.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Al autorizar, el monto se descontará automáticamente del saldo APRE 2026.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    El proyecto pasará formalmente a la <strong>Etapa 5 (Ejecución y Control Técnico)</strong> para el técnico responsable.
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPlayConfirmProject(null)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPlay}
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-colors flex items-center gap-2 cursor-pointer ring-2 ring-emerald-500/50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Confirmar e Iniciar Ejecución</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Stage4GimnasiaMonetaria as Stage4BolsaReadecuacion };
