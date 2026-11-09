import React, { useState } from 'react';
import { Project, Role, Area, ReviewStatus, BudgetItem } from '../types/budget';
import { formatCLP, MONTH_NAMES, AREA_CONFIG, formatDateSpanish } from '../utils/formatters';
import { useCatalog } from '../CatalogContext';
import { 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2, 
  MessageSquare,
  Search,
  Check,
  Edit3,
  Calendar,
  User,
  Layers,
  Save,
  X,
  PlusCircle,
  Lock,
  Unlock,
  ShieldAlert,
  CalendarDays
} from 'lucide-react';

interface Stage1FormulacionProps {
  projects: Project[];
  onAddProject: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  currentRole: Role;
  currentFiscalYear?: number;
}

export const Stage1Formulacion: React.FC<Stage1FormulacionProps> = ({
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  currentRole,
  currentFiscalYear = 2026,
}) => {
  const { areas, tecnicos } = useCatalog();
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(projects[0]?.id || null);
  
  // Planning Deadline State (Panel de Control de Paola)
  const defaultDeadline = currentFiscalYear === 2027 ? '2026-09-30' : '2026-03-31';
  const [isPlanningClosed, setIsPlanningClosed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`ua_talca_planning_closed_state_${currentFiscalYear}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [deadlineDate, setDeadlineDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`ua_talca_planning_deadline_date_${currentFiscalYear}`);
      return saved || defaultDeadline;
    } catch {
      return defaultDeadline;
    }
  });

  // Keep deadline in sync when switching between fiscal years
  React.useEffect(() => {
    const dDate = currentFiscalYear === 2027 ? '2026-09-30' : '2026-03-31';
    try {
      const savedDate = localStorage.getItem(`ua_talca_planning_deadline_date_${currentFiscalYear}`);
      const savedClosed = localStorage.getItem(`ua_talca_planning_closed_state_${currentFiscalYear}`);
      setDeadlineDate(savedDate || dDate);
      setIsPlanningClosed(savedClosed === 'true');
    } catch {
      setDeadlineDate(dDate);
      setIsPlanningClosed(false);
    }
  }, [currentFiscalYear]);

  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState(deadlineDate);

  // Permission logic: Technician is blocked if planning deadline is closed
  const isTechnicianBlocked = currentRole === 'tecnico' && isPlanningClosed;
  const canEditAnyProject = !isTechnicianBlocked; // Paola (coordinador) & Director can always edit as exception

  const handleTogglePlanningDeadline = () => {
    if (currentRole === 'tecnico') {
      alert('Acción restringida: Solo la Coordinadora (Paola) o el Director pueden modificar el plazo de formulación.');
      return;
    }
    const nextVal = !isPlanningClosed;
    setIsPlanningClosed(nextVal);
    try {
      localStorage.setItem(`ua_talca_planning_closed_state_${currentFiscalYear}`, String(nextVal));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDeadlineDate = (e: React.FormEvent) => {
    e.preventDefault();
    setDeadlineDate(tempDate);
    try {
      localStorage.setItem(`ua_talca_planning_deadline_date_${currentFiscalYear}`, tempDate);
    } catch (e) {
      console.error(e);
    }
    setIsDateModalOpen(false);
  };

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Inline editing state for items in tables
  const [inlineEditingItemId, setInlineEditingItemId] = useState<string | null>(null);
  const [inlineDesc, setInlineDesc] = useState('');
  const [inlineQty, setInlineQty] = useState(1);
  const [inlinePrice, setInlinePrice] = useState(0);

  // Form state for creating a new project
  const [newTitle, setNewTitle] = useState('');
  const [newDestino, setNewDestino] = useState('');
  const [newArea, setNewArea] = useState<Area>('Usuarios');
  const [newResponsible, setNewResponsible] = useState(
    currentRole === 'coordinador' ? 'Paola' : 'Cristian'
  );
  const [newStartMonth, setNewStartMonth] = useState(3);
  const [newJustification, setNewJustification] = useState('');
  const [newItems, setNewItems] = useState<Array<{
    description: string;
    justification: string;
    quantity: string | number;
    unitPriceCLP: string | number;
  }>>([
    { description: '', justification: '', quantity: '1', unitPriceCLP: '' },
  ]);

  // Form state for editing an existing project in modal
  const [editTitle, setEditTitle] = useState('');
  const [editDestino, setEditDestino] = useState('');
  const [editArea, setEditArea] = useState<Area>('Usuarios');
  const [editResponsible, setEditResponsible] = useState('');
  const [editStartMonth, setEditStartMonth] = useState(1);
  const [editJustification, setEditJustification] = useState('');
  const [editItems, setEditItems] = useState<Array<{
    id: string;
    description: string;
    justification: string;
    quantity: string | number;
    unitPriceCLP: string | number;
    totalPriceCLP: number;
    accountCode?: string;
  }>>([]);

  // Calculations for Stage 1
  const totalProjects = projects.length;
  const totalFormulatedBudget = projects.reduce((acc, p) => acc + p.requestedBudgetCLP, 0);
  const approvedCount = projects.filter((p) => p.reviewStatus === 'Aprobado').length;
  const pendingCount = projects.filter((p) => p.reviewStatus === 'En Revisión' || p.reviewStatus === 'Borrador').length;

  const filteredProjects = projects.filter((p) => {
    const matchArea = selectedArea === 'all' || p.area === selectedArea;
    const matchStatus = selectedStatus === 'all' || p.reviewStatus === selectedStatus;
    const matchSearch =
      searchTerm === '' ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.responsible.toLowerCase().includes(searchTerm.toLowerCase());
    return matchArea && matchStatus && matchSearch;
  });

  // Create Project item row handlers
  const handleAddItemRow = () => {
    setNewItems([...newItems, { description: '', justification: '', quantity: '1', unitPriceCLP: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (newItems.length === 1) return;
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: 'description' | 'justification' | 'quantity' | 'unitPriceCLP',
    value: string
  ) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
  };

  const calculateNewTotal = () => {
    return newItems.reduce((acc, it) => {
      const q = parseInt(String(it.quantity).replace(/\D/g, ''), 10) || 0;
      const p = parseInt(String(it.unitPriceCLP).replace(/\D/g, ''), 10) || 0;
      return acc + q * p;
    }, 0);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDestino.trim() || !newJustification.trim()) {
      alert('Por favor complete el nombre, destino y justificación técnica del proyecto.');
      return;
    }

    const validItems: BudgetItem[] = newItems
      .filter((it) => it.description.trim() !== '')
      .map((it, idx) => {
        const q = Math.max(1, parseInt(String(it.quantity).replace(/\D/g, ''), 10) || 1);
        const p = Math.max(0, parseInt(String(it.unitPriceCLP).replace(/\D/g, ''), 10) || 0);
        return {
          id: `item-new-${Date.now()}-${idx}`,
          description: it.description.trim(),
          justification: it.justification.trim() || undefined,
          quantity: q,
          unitPriceCLP: p,
          totalPriceCLP: q * p,
        };
      });

    if (validItems.length === 0) {
      alert('Debe ingresar al menos un ítem con descripción y monto.');
      return;
    }

    const projectTotal = validItems.reduce((sum, it) => sum + it.totalPriceCLP, 0);

    const yearProjectsCount = projects.filter(
      (p) => (p.fiscalYear || 2026) === currentFiscalYear
    ).length;

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      code: `TIC-TAL-${currentFiscalYear}-${String(yearProjectsCount + 1).padStart(3, '0')}`,
      fiscalYear: currentFiscalYear,
      title: newTitle.trim(),
      destino: newDestino.trim(),
      area: newArea,
      responsible: newResponsible.trim(),
      estimatedStartMonth: newStartMonth,
      justification: newJustification.trim(),
      reviewStatus: currentRole === 'director' ? 'Aprobado' : 'En Revisión',
      directorNotes: currentRole === 'director' ? 'Aprobado directamente por Dirección TIC.' : '',
      items: validItems,
      requestedBudgetCLP: projectTotal,
      approvedCeilingCLP: projectTotal,
      executedBudgetCLP: 0,
      progressPercentage: 0,
      executionStatus: 'No Iniciado',
      isExtrapresupuestario: false,
      bitacora: [],
    };

    onAddProject(newProject);
    setIsCreateModalOpen(false);
    // Reset form
    setNewTitle('');
    setNewDestino('');
    setNewJustification('');
    setNewItems([{ description: '', justification: '', quantity: '1', unitPriceCLP: '' }]);
    setExpandedProjectId(newProject.id);
  };

  // Open Edit Modal for a project
  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setEditTitle(project.title);
    setEditDestino(project.destino || '');
    setEditArea(project.area);
    setEditResponsible(project.responsible);
    setEditStartMonth(project.estimatedStartMonth);
    setEditJustification(project.justification);
    setEditItems(
      project.items.map((it) => ({
        id: it.id,
        description: it.description,
        justification: it.justification || '',
        quantity: String(it.quantity),
        unitPriceCLP: it.unitPriceCLP === 0 ? '' : String(it.unitPriceCLP),
        totalPriceCLP: it.totalPriceCLP,
        accountCode: it.accountCode,
      }))
    );
  };

  // Edit Modal Item handlers
  const handleEditModalItemChange = (index: number, field: string, value: any) => {
    const updated = [...editItems];
    const item = { ...updated[index], [field]: value };
    const q = parseInt(String(item.quantity).replace(/\D/g, ''), 10) || 0;
    const p = parseInt(String(item.unitPriceCLP).replace(/\D/g, ''), 10) || 0;
    item.totalPriceCLP = q * p;
    updated[index] = item;
    setEditItems(updated);
  };

  const handleEditModalAddItem = () => {
    setEditItems([
      ...editItems,
      {
        id: `item-edit-${Date.now()}`,
        description: '',
        justification: '',
        quantity: '1',
        unitPriceCLP: '',
        totalPriceCLP: 0,
      },
    ]);
  };

  const handleEditModalRemoveItem = (index: number) => {
    if (editItems.length === 1) {
      alert('El proyecto debe contener al menos un ítem.');
      return;
    }
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleSaveEditedProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    if (!editTitle.trim() || !editDestino.trim() || !editJustification.trim()) {
      alert('Por favor complete el nombre, destino y justificación técnica del proyecto.');
      return;
    }

    const validItems: BudgetItem[] = editItems
      .filter((it) => it.description.trim() !== '')
      .map((it) => {
        const q = Math.max(1, parseInt(String(it.quantity).replace(/\D/g, ''), 10) || 1);
        const p = Math.max(0, parseInt(String(it.unitPriceCLP).replace(/\D/g, ''), 10) || 0);
        return {
          id: it.id,
          description: it.description.trim(),
          justification: it.justification.trim() || undefined,
          quantity: q,
          unitPriceCLP: p,
          totalPriceCLP: q * p,
          accountCode: it.accountCode,
        };
      });

    if (validItems.length === 0) {
      alert('Debe tener al menos un ítem con descripción y monto.');
      return;
    }

    const newTotal = validItems.reduce((acc, it) => acc + it.totalPriceCLP, 0);

    const updated: Project = {
      ...editingProject,
      title: editTitle.trim(),
      destino: editDestino.trim(),
      area: editArea,
      responsible: editResponsible.trim(),
      estimatedStartMonth: editStartMonth,
      justification: editJustification.trim(),
      items: validItems,
      requestedBudgetCLP: newTotal,
      approvedCeilingCLP: newTotal,
    };

    onUpdateProject(updated);
    setEditingProject(null);
  };

  // Direct In-Place Item handlers for quick editing in table
  const handleStartInlineItemEdit = (item: BudgetItem) => {
    setInlineEditingItemId(item.id);
    setInlineDesc(item.description);
    setInlineQty(item.quantity);
    setInlinePrice(item.unitPriceCLP);
  };

  const handleSaveInlineItem = (project: Project, itemId: string) => {
    if (!inlineDesc.trim()) {
      alert('La descripción no puede estar vacía.');
      return;
    }

    const updatedItems = project.items.map((it) => {
      if (it.id === itemId) {
        const qty = Math.max(1, inlineQty || 1);
        const price = Math.max(0, inlinePrice || 0);
        return {
          ...it,
          description: inlineDesc.trim(),
          quantity: qty,
          unitPriceCLP: price,
          totalPriceCLP: qty * price,
        };
      }
      return it;
    });

    const newTotal = updatedItems.reduce((acc, it) => acc + it.totalPriceCLP, 0);

    onUpdateProject({
      ...project,
      items: updatedItems,
      requestedBudgetCLP: newTotal,
      approvedCeilingCLP: newTotal,
    });

    setInlineEditingItemId(null);
  };

  const handleQuickAddItemToProject = (project: Project) => {
    const newItem: BudgetItem = {
      id: `item-quick-${Date.now()}`,
      description: 'Nuevo ítem / adquisición técnica',
      quantity: 1,
      unitPriceCLP: 250000,
      totalPriceCLP: 250000,
    };

    const updatedItems = [...project.items, newItem];
    const newTotal = updatedItems.reduce((acc, it) => acc + it.totalPriceCLP, 0);

    onUpdateProject({
      ...project,
      items: updatedItems,
      requestedBudgetCLP: newTotal,
      approvedCeilingCLP: newTotal,
    });

    // Directly put this new item into inline editing mode
    handleStartInlineItemEdit(newItem);
  };

  const handleQuickDeleteItem = (project: Project, itemId: string) => {
    if (project.items.length <= 1) {
      alert('El proyecto debe conservar al menos un ítem presupuestario.');
      return;
    }

    if (confirm('¿Confirma eliminar este ítem del proyecto?')) {
      const updatedItems = project.items.filter((it) => it.id !== itemId);
      const newTotal = updatedItems.reduce((acc, it) => acc + it.totalPriceCLP, 0);

      onUpdateProject({
        ...project,
        items: updatedItems,
        requestedBudgetCLP: newTotal,
        approvedCeilingCLP: newTotal,
      });
    }
  };

  const handleUpdateStatus = (project: Project, newStatus: ReviewStatus) => {
    onUpdateProject({
      ...project,
      reviewStatus: newStatus,
    });
  };

  const handleUpdateDirectorNotes = (project: Project, notes: string) => {
    onUpdateProject({
      ...project,
      directorNotes: notes,
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Panel de Control de Paola: Plazo de Cierre de Planificación */}
      <section aria-label="Panel de Control de Coordinación TIC" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-[#0F294A] text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-900/90 rounded-lg text-white border border-blue-800 shadow-inner shrink-0">
              {isPlanningClosed ? (
                <Lock className="w-5 h-5 text-amber-300" />
              ) : (
                <Unlock className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Panel de Control de Coordinación TIC (Paola)
                </span>
                <span className="text-xs text-blue-400">·</span>
                <span className="text-xs text-blue-200">Universidad Autónoma de Chile (Sede Talca)</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Plazo de Cierre de Planificación Presupuestaria {currentFiscalYear}
                {currentFiscalYear === 2027 && (
                  <span className="ml-2 text-xs font-semibold bg-[#ff6900] text-black px-2 py-0.5 rounded uppercase">
                    Cierre Septiembre Institucional
                  </span>
                )}
              </h3>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            {isPlanningClosed ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/40 text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                <span>PLAZO CERRADO (Técnicos Bloqueados)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>PLAZO ABIERTO (Formulación Activa)</span>
              </span>
            )}
          </div>
        </div>

        {/* Panel Actions & Explanations */}
        <div className="p-5 bg-slate-50/70 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-800">
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <CalendarDays className="w-4 h-4 text-blue-700" />
                Fecha Límite Oficial:
                <span className="font-mono text-sm font-bold bg-white px-2.5 py-0.5 rounded border border-slate-300 text-blue-900 ml-1">
                  {formatDateSpanish(deadlineDate)}
                </span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-600">
                {isPlanningClosed
                  ? 'La formulación está bloqueada para Técnicos. Solo Paola o el Director pueden autorizar modificaciones.'
                  : 'Los técnicos de área pueden ingresar proyectos y desglosar ítems en CLP antes del traspaso a APRE.'}
              </span>
            </div>

            {/* Context Notice for current role */}
            {currentRole === 'tecnico' && (
              <div className={`p-2.5 rounded-lg text-xs font-medium border flex items-center gap-2.5 ${
                isPlanningClosed 
                  ? 'bg-amber-50 text-amber-950 border-amber-300' 
                  : 'bg-blue-50 text-blue-950 border-blue-200'
              }`}>
                {isPlanningClosed ? (
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                )}
                <span>
                  {isPlanningClosed 
                    ? 'Aviso de Perfil Técnico: El plazo de formulación ha sido CERRADO por la Coordinadora Paola. No es posible crear nuevos proyectos ni editar líneas de ítems. Contacte a Paola o al Director para excepciones.'
                    : 'Aviso de Perfil Técnico: Recuerde registrar la justificación y costos unitarios referenciales en CLP antes de la fecha de cierre.'}
                </span>
              </div>
            )}

            {(currentRole === 'coordinador' || currentRole === 'director') && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-blue-700" />
                <span>
                  Modo de Supervisión Activo (<strong>{currentRole === 'coordinador' ? 'Paola' : 'Director'}</strong>): Posee privilegios de ajuste y excepción en cualquier momento del ciclo.
                </span>
              </div>
            )}
          </div>

          {/* Action buttons for Paola and Director */}
          {(currentRole === 'coordinador' || currentRole === 'director') && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTempDate(deadlineDate);
                  setIsDateModalOpen(true);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                title="Fijar o cambiar la fecha de cierre de planificación"
              >
                <CalendarDays className="w-4 h-4 text-blue-700" />
                <span>Fijar / Cambiar Fecha</span>
              </button>

              <button
                type="button"
                onClick={handleTogglePlanningDeadline}
                className={`px-4 py-2 text-sm font-bold rounded-lg text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer ${
                  isPlanningClosed
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-700 hover:bg-rose-800'
                }`}
                title={isPlanningClosed ? 'Reabrir plazo para que los técnicos puedan editar' : 'Bloquear edición técnica'}
              >
                {isPlanningClosed ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Reabrir Plazo</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Cerrar Plazo y Bloquear</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Top Stage Context & Metrics Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 uppercase tracking-wider mb-1">
              <span>Etapa 1 de 5</span>
              <span>·</span>
              <span>Levantamiento y Negociación de Requerimientos</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Formulación Técnica de Proyectos TIC {currentFiscalYear}
            </h2>
            <p className="text-base text-slate-600 mt-1 max-w-4xl">
              Defina o edite proyectos por área para el ejercicio {currentFiscalYear}, ajuste en reuniones los ítems de hardware, software o servicios con valores referenciales CLP, y mantenga actualizada la justificación técnica antes del cierre de plazo.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {isTechnicianBlocked ? (
              <button
                disabled
                className="flex items-center gap-2 bg-slate-300 text-slate-500 font-semibold px-5 py-3 rounded-lg shadow-xs cursor-not-allowed text-base"
                title="Plazo de formulación cerrado por Paola. Solicite reapertura a Coordinación o Dirección."
              >
                <Lock className="w-5 h-5 text-slate-400" />
                <span>+ Nuevo Proyecto (Plazo Cerrado)</span>
              </button>
            ) : (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-[#da291c] hover:bg-[#b81e13] text-white font-bold px-5 py-3 rounded-lg shadow-md transition-all text-base cursor-pointer ring-1 ring-white/20"
              >
                <Plus className="w-5 h-5" />
                <span>+ Crear Nuevo Proyecto {currentFiscalYear}</span>
              </button>
            )}
          </div>
        </div>

        {/* High Contrast Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Monto Total Formulado</p>
            <p className="text-2xl font-bold text-slate-900 font-tabular mt-1">
              {formatCLP(totalFormulatedBudget)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Suma referencial CLP</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Proyectos Totales</p>
            <p className="text-2xl font-bold text-slate-900 font-tabular mt-1">
              {totalProjects}
            </p>
            <p className="text-xs text-slate-500 mt-1">En las 7 áreas institucionales</p>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200">
            <p className="text-sm font-medium text-emerald-800">Aprobados por Director</p>
            <p className="text-2xl font-bold text-emerald-700 font-tabular mt-1">
              {approvedCount}
            </p>
            <p className="text-xs text-emerald-600 mt-1">Listos para Asignación Contable</p>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800">Pendientes de Aprobación</p>
            <p className="text-2xl font-bold text-amber-700 font-tabular mt-1">
              {pendingCount}
            </p>
            <p className="text-xs text-amber-600 mt-1">En revisión o con observaciones</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with Color-Coded Area Pills */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código, nombre o responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Estado:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:bg-white"
              >
                <option value="all">Todos los Estados</option>
                <option value="Aprobado">Aprobado</option>
                <option value="En Revisión">En Revisión</option>
                <option value="Ajuste Solicitado">Ajuste Solicitado</option>
                <option value="Borrador">Borrador</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-slate-500 font-medium">
            Mostrando <strong>{filteredProjects.length}</strong> de {projects.length} proyectos formulados
          </div>
        </div>

        {/* Quick Area Pill Filters with Institutional Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Filtrar por Área TIC:
          </span>
          <button
            type="button"
            onClick={() => setSelectedArea('all')}
            className={`px-3 py-1 text-xs rounded-full font-semibold transition-all cursor-pointer ${
              selectedArea === 'all'
                ? 'bg-[#0F294A] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas ({projects.length})
          </button>
          {areas.map((a) => {
            const areaName = a.name as Area;
            const style = AREA_CONFIG[areaName] || {
              label: a.name as Area,
              badge: 'bg-slate-100 text-slate-800 border-slate-300',
              dot: 'bg-slate-600',
              border: 'border-l-slate-500',
            };
            const isSelected = selectedArea === a.name;
            const count = projects.filter((p) => p.area === a.name).length;
            return (
              <button
                key={a.name}
                type="button"
                onClick={() => setSelectedArea(isSelected ? 'all' : a.name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                  style.badge
                } ${isSelected ? 'ring-2 ring-blue-600 font-bold shadow-xs' : 'opacity-85 hover:opacity-100'}`}
              >
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span>{a.name}</span>
                <span className="text-[10px] bg-white/80 px-1.5 py-0.2 rounded-full font-bold ml-0.5">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-2xl mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-[#ff6900]">
              <PlusCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Aún no hay proyectos formulados para el ejercicio {currentFiscalYear}
            </h3>
            <p className="text-base text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
              Inicie la formulación del anteproyecto presupuestario TIC para {currentFiscalYear} ingresando el primer proyecto y desglosando sus ítems e inversión requerida en CLP.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#da291c] hover:bg-[#b81e13] text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all text-base cursor-pointer ring-1 ring-white/20"
            >
              <Plus className="w-5 h-5" />
              <span>+ Crear Nuevo Proyecto {currentFiscalYear}</span>
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-lg font-medium text-slate-700">No se encontraron proyectos con los filtros seleccionados.</p>
            <p className="text-sm text-slate-500 mt-1">Pruebe limpiando la búsqueda o agregue un nuevo proyecto técnico para {currentFiscalYear}.</p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            const itemsCount = project.items.length;
            const areaStyle = AREA_CONFIG[project.area] || AREA_CONFIG['Salas Especiales'];

            return (
              <div
                key={project.id}
                className={`bg-white border rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all border-l-4 ${areaStyle.border}`}
              >
                {/* Project Header Row */}
                <div
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
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

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded">
                          {project.code}
                        </span>
                        
                        {/* Area Color-Coded Badge */}
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${areaStyle.badge}`}>
                          <span className={`w-2 h-2 rounded-full ${areaStyle.dot}`} />
                          <span>{project.area}</span>
                        </span>

                        <span className="text-xs text-slate-500">
                          Inicio est: <strong>{MONTH_NAMES[project.estimatedStartMonth - 1]} 2026</strong>
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600">
                          Resp: <strong>{project.responsible}</strong>
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        {project.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 md:pl-4 md:border-l md:border-slate-200">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-medium">Presupuesto Formulado</p>
                      <p className="text-xl font-bold text-slate-900 font-tabular">
                        {formatCLP(project.requestedBudgetCLP)}
                      </p>
                      <p className="text-xs text-slate-500">{itemsCount} {itemsCount === 1 ? 'ítem' : 'ítems'}</p>
                    </div>

                    <div className="shrink-0">
                      {project.reviewStatus === 'Aprobado' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Aprobado</span>
                        </div>
                      )}
                      {project.reviewStatus === 'En Revisión' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-sm font-semibold">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>En Revisión</span>
                        </div>
                      )}
                      {project.reviewStatus === 'Ajuste Solicitado' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-semibold">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Ajuste Solicitado</span>
                        </div>
                      )}
                      {project.reviewStatus === 'Borrador' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold">
                          <span>Borrador</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Edit Button in Header */}
                    {isTechnicianBlocked ? (
                      <span
                        className="p-2 text-slate-400 bg-slate-100 rounded-lg border border-slate-200 cursor-not-allowed"
                        title="Plazo cerrado por Paola. Edición bloqueada para Técnicos."
                      >
                        <Lock className="w-4 h-4 text-slate-400" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditProject(project);
                        }}
                        className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                        title="Editar Proyecto Completo e Ítems"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-200 space-y-6">
                    {/* Project Header Summary & Edit Project Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-700" />
                          Responsable: <strong>{project.responsible}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-700" />
                          Área: <strong>{project.area}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                          Mes Inicio: <strong>{MONTH_NAMES[project.estimatedStartMonth - 1]} 2026</strong>
                        </span>
                      </div>

                      {isTechnicianBlocked ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 shrink-0">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Modo Solo Lectura (Plazo Cerrado)</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEditProject(project)}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-md border border-blue-300 transition-colors shrink-0 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar Proyecto y Metadatos</span>
                        </button>
                      )}
                    </div>

                    {/* Technical Justification */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                          Justificación Técnica Institucional:
                        </h4>
                      </div>
                      <p className="text-base text-slate-700 leading-relaxed">
                        {project.justification}
                      </p>
                    </div>

                    {/* Destino del Proyecto */}
                    {project.destino && (
                      <div className="bg-slate-50 px-4 py-3 rounded-lg border border-slate-200 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                          Destino del Proyecto:
                        </span>
                        <span className="text-sm font-semibold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-300">
                          {project.destino}
                        </span>
                      </div>
                    )}

                    {/* Breakdown of items with In-Place Editing */}
                    <div>
                      {isTechnicianBlocked && (
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 font-medium flex items-center gap-2 mb-3">
                          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            Plazo de formulación cerrado por Paola: Los ítems se encuentran en modo solo lectura para el perfil Técnico.
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <span>Desglose de Ítems e Inversiones</span>
                            <span className="text-xs font-normal text-slate-500">
                              (Editable en tiempo real en CLP)
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500">
                            {isTechnicianBlocked
                              ? 'Consulte con Paola o el Director para autorizar modificaciones excepcionales.'
                              : 'Haga clic en el lápiz para editar cualquier línea o use el botón para agregar un nuevo ítem.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isTechnicianBlocked ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Ítems Bloqueados</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickAddItemToProject(project)}
                              className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md border border-emerald-300 transition-colors cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>+ Agregar Ítem</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold text-xs">
                            <tr>
                              <th className="py-3 px-3">#</th>
                              <th className="py-3 px-3">Descripción del Ítem / Equipamiento</th>
                              <th className="py-3 px-3 text-center">Cantidad</th>
                              <th className="py-3 px-3 text-right">Valor Unitario (CLP)</th>
                              <th className="py-3 px-3 text-right">Subtotal (CLP)</th>
                              <th className="py-3 px-3 text-center w-24">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-800">
                            {project.items.map((item, index) => {
                              const isEditingThis = inlineEditingItemId === item.id;

                              if (isEditingThis) {
                                const tempSubtotal = (inlineQty || 1) * (inlinePrice || 0);
                                return (
                                  <tr key={item.id} className="bg-blue-50/70 border-2 border-blue-400">
                                    <td className="py-2.5 px-3 font-mono text-xs text-blue-900 font-bold">{index + 1}</td>
                                    <td className="py-2.5 px-3">
                                      <input
                                        type="text"
                                        value={inlineDesc}
                                        onChange={(e) => setInlineDesc(e.target.value)}
                                        className="w-full p-1.5 bg-white border border-blue-500 rounded text-sm text-slate-900 font-medium focus:ring-1 focus:ring-blue-500"
                                        placeholder="Descripción del ítem"
                                        autoFocus
                                      />
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <input
                                        type="number"
                                        min="1"
                                        value={inlineQty}
                                        onChange={(e) => setInlineQty(parseInt(e.target.value, 10) || 1)}
                                        className="w-20 p-1.5 bg-white border border-blue-500 rounded text-sm text-center font-tabular font-bold"
                                      />
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <input
                                        type="number"
                                        min="0"
                                        step="10000"
                                        value={inlinePrice}
                                        onChange={(e) => setInlinePrice(parseInt(e.target.value, 10) || 0)}
                                        className="w-32 p-1.5 bg-white border border-blue-500 rounded text-sm text-right font-tabular font-bold"
                                      />
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-tabular font-bold text-blue-950">
                                      {formatCLP(tempSubtotal)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveInlineItem(project, item.id)}
                                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs cursor-pointer"
                                          title="Guardar cambios de la fila"
                                        >
                                          <Save className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setInlineEditingItemId(null)}
                                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer"
                                          title="Cancelar edición"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={item.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-3 font-mono text-slate-500 text-xs">{index + 1}</td>
                                  <td className="py-3 px-3 font-medium text-slate-900">{item.description}</td>
                                  <td className="py-3 px-3 text-center font-tabular font-medium">{item.quantity}</td>
                                  <td className="py-3 px-3 text-right font-tabular text-slate-600">{formatCLP(item.unitPriceCLP)}</td>
                                  <td className="py-3 px-3 text-right font-tabular font-bold text-slate-900">{formatCLP(item.totalPriceCLP)}</td>
                                  <td className="py-3 px-3 text-center">
                                    {isTechnicianBlocked ? (
                                      <span className="text-xs text-slate-400 flex items-center justify-center gap-1" title="Plazo cerrado">
                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      </span>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleStartInlineItemEdit(item)}
                                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                                          title="Editar este ítem directamente"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleQuickDeleteItem(project, item.id)}
                                          disabled={project.items.length === 1}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded disabled:opacity-20 cursor-pointer"
                                          title="Eliminar este ítem"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-slate-100/80 font-bold border-t border-slate-200 text-slate-900">
                            <tr>
                              <td colSpan={4} className="py-3 px-3 text-right text-sm">
                                Total Formulado Proyecto:
                              </td>
                              <td className="py-3 px-3 text-right font-tabular text-base text-blue-900">
                                {formatCLP(project.requestedBudgetCLP)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Director Review & Notes Section */}
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-700" />
                          <h4 className="text-base font-bold text-blue-950">
                            Revisión de Dirección TIC Sede Talca
                          </h4>
                        </div>

                        {/* Status Change Buttons for Director or Coordinator */}
                        {(currentRole === 'director' || currentRole === 'coordinador') && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(project, 'Aprobado')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                                project.reviewStatus === 'Aprobado'
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Aprobar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(project, 'Ajuste Solicitado')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                project.reviewStatus === 'Ajuste Solicitado'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
                              }`}
                            >
                              Pedir Ajuste
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(project, 'En Revisión')}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                project.reviewStatus === 'En Revisión'
                                  ? 'bg-blue-700 text-white shadow-xs'
                                  : 'bg-white border border-blue-300 text-blue-800 hover:bg-blue-50'
                              }`}
                            >
                              En Revisión
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Observations Notes Input */}
                      {currentRole === 'director' || currentRole === 'coordinador' ? (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Observaciones de Dirección / Acuerdos de Reunión:
                          </label>
                          <textarea
                            value={project.directorNotes || ''}
                            onChange={(e) => handleUpdateDirectorNotes(project, e.target.value)}
                            placeholder="Ingrese observaciones de revisión técnica, reducciones de ítems acordadas, o condiciones de aprobación..."
                            rows={2}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700 italic bg-white p-3 rounded border border-slate-200">
                          {project.directorNotes || 'Sin observaciones registradas por Dirección.'}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProject(project)}
                          className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar Proyecto Completo e Ítems
                        </button>

                        {currentRole === 'director' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Confirma eliminar el proyecto ${project.code}?`)) {
                                onDeleteProject(project.id);
                              }
                            }}
                            className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 hover:underline"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar Formulación
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Formular Nuevo Proyecto TIC */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full border border-[#d2d2d2] my-8 overflow-hidden">
            <div className="bg-[#000000] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#da291c]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#da291c] text-white flex items-center justify-center font-bold text-sm tracking-wider">
                  UA
                </div>
                <div>
                  <h3 className="text-lg font-bold">Formular Nuevo Proyecto TIC 2026</h3>
                  <p className="text-xs text-[#d2d2d2]">Dirección TIC · Universidad Autónoma de Chile, Sede Talca</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#d2d2d2] hover:text-white p-1 rounded-md text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Nombre del Proyecto <span className="text-[#da291c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Implementación de Red Inalámbrica Pabellón de Postgrados"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Destino del Proyecto <span className="text-[#da291c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newDestino}
                    onChange={(e) => setNewDestino(e.target.value)}
                    placeholder="Ej: Campus Alameda - Lab 414"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Área TIC <span className="text-[#da291c]">*</span>
                  </label>
                  <select
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value as Area)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-[#da291c]"
                  >
                    {areas.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Mes Estimado de Inicio <span className="text-[#da291c]">*</span>
                  </label>
                  <select
                    value={newStartMonth}
                    onChange={(e) => setNewStartMonth(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-[#da291c]"
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name} 2026
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Responsable Técnico Oficial <span className="text-[#da291c]">*</span>
                  </label>
                  <select
                    required
                    value={newResponsible}
                    onChange={(e) => setNewResponsible(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-[#da291c]"
                  >
                    {tecnicos.map((tech) => (
                      <option key={tech.name} value={tech.name}>
                        {tech.name} (Técnico TIC)
                      </option>
                    ))}
                    <option value="Paola">Paola (Coordinadora TIC)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Justificación Técnica Institucional <span className="text-[#da291c]">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newJustification}
                    onChange={(e) => setNewJustification(e.target.value)}
                    placeholder="Explique el impacto académico/operativo, estado del equipamiento actual y consecuencias de no realizar el proyecto..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                  />
                </div>
              </div>

              {/* Items Breakdown Builder with 4 Explicit Column Headers */}
              <div className="border-t border-[#d2d2d2] pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Desglose de Ítems e Inversiones Requeridas
                    </h4>
                    <p className="text-xs text-slate-500">
                      Complete las líneas solicitadas indicando detalle técnico, justificación del ítem, cantidad y precio unitario.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#da291c] hover:bg-[#b81e13] px-3.5 py-1.5 rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Ítem</span>
                  </button>
                </div>

                {/* 4 Explicit Column Headers for Items */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-lg border border-[#d2d2d2] mb-2 tracking-wide">
                  <div className="col-span-4">Detalle</div>
                  <div className="col-span-3">Justificación</div>
                  <div className="col-span-1 text-center">Cantidad</div>
                  <div className="col-span-2 text-right">Precio Unitario en CLP IVA Incluido</div>
                  <div className="col-span-1 text-right">Subtotal</div>
                  <div className="col-span-1 text-center">Acción</div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {newItems.map((item, index) => {
                    const q = parseInt(String(item.quantity).replace(/\D/g, ''), 10) || 0;
                    const p = parseInt(String(item.unitPriceCLP).replace(/\D/g, ''), 10) || 0;
                    const rowSubtotal = q * p;

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-slate-50/70 hover:bg-white rounded-lg border border-[#d2d2d2] items-center shadow-2xs transition-all"
                      >
                        {/* 1. Detalle */}
                        <div className="sm:col-span-4">
                          <label className="block sm:hidden text-xs font-bold text-slate-700 mb-0.5">
                            Detalle:
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Switch 24 puertos PoE+ gigabit"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                          />
                        </div>

                        {/* 2. Justificación */}
                        <div className="sm:col-span-3">
                          <label className="block sm:hidden text-xs font-bold text-slate-700 mb-0.5">
                            Justificación:
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Reemplazo equipo siniestrado"
                            value={item.justification}
                            onChange={(e) => handleItemChange(index, 'justification', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                          />
                        </div>

                        {/* 3. Cantidad (permite borrar y editar en blanco libremente) */}
                        <div className="sm:col-span-1">
                          <label className="block sm:hidden text-xs font-bold text-slate-700 mb-0.5">
                            Cantidad:
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-center font-bold font-tabular text-slate-900 focus:border-[#da291c]"
                          />
                        </div>

                        {/* 4. Precio Unitario en CLP IVA Incluido (permite borrar y editar en blanco libremente) */}
                        <div className="sm:col-span-2">
                          <label className="block sm:hidden text-xs font-bold text-slate-700 mb-0.5">
                            Precio Unitario en CLP IVA Incluido:
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="0"
                            value={item.unitPriceCLP}
                            onChange={(e) => handleItemChange(index, 'unitPriceCLP', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-right font-bold font-tabular text-slate-900 focus:border-[#da291c]"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="sm:col-span-1 text-right font-tabular text-sm font-bold text-slate-900 whitespace-nowrap">
                          <span className="sm:hidden text-xs text-slate-500 mr-1">Subtotal:</span>
                          {formatCLP(rowSubtotal)}
                        </div>

                        {/* Acción */}
                        <div className="sm:col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            disabled={newItems.length === 1}
                            className="p-1.5 text-slate-400 hover:text-[#da291c] hover:bg-rose-50 rounded disabled:opacity-20 cursor-pointer"
                            title="Eliminar este ítem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3.5 bg-slate-50 rounded-lg flex items-center justify-between border-2 border-[#da291c]">
                  <span className="text-sm font-bold text-slate-900">Total Formulado Proyecto (CLP IVA Incluido):</span>
                  <span className="text-xl font-extrabold font-tabular text-[#da291c]">
                    {formatCLP(calculateNewTotal())}
                  </span>
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#d2d2d2]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-[#da291c] hover:bg-[#b81e13] rounded-lg shadow-md transition-all cursor-pointer"
                >
                  Registrar Formulación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Proyecto Completo e Ítems */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full border border-[#d2d2d2] my-8 overflow-hidden">
            <div className="bg-[#000000] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#da291c]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#da291c] text-white">
                    {editingProject.code}
                  </span>
                  <h3 className="text-lg font-bold">Editar Proyecto Técnico e Ítems</h3>
                </div>
                <p className="text-xs text-[#d2d2d2] mt-0.5">
                  Período de Ajustes y Plazo de Modificación · Dirección TIC Sede Talca
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-[#d2d2d2] hover:text-white p-1 rounded-md text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedProject} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Nombre del Proyecto <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-blue-600 font-semibold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Destino del Proyecto <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editDestino}
                    onChange={(e) => setEditDestino(e.target.value)}
                    placeholder="Ej: Campus Alameda - Lab 414"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-blue-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Área TIC <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value as Area)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white"
                  >
                    {areas.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Mes Estimado de Inicio <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={editStartMonth}
                    onChange={(e) => setEditStartMonth(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white"
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name} 2026
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Responsable Técnico Oficial <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    value={editResponsible}
                    onChange={(e) => setEditResponsible(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white"
                  >
                    {tecnicos.map((tech) => (
                      <option key={tech.name} value={tech.name}>
                        {tech.name} (Técnico TIC)
                      </option>
                    ))}
                    <option value="Paola">Paola (Coordinadora TIC)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-800 mb-1">
                    Justificación Técnica Institucional <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={editJustification}
                    onChange={(e) => setEditJustification(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Items Breakdown Editor with 4 Explicit Column Headers */}
              <div className="border-t border-[#d2d2d2] pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Edición de Líneas de Ítems e Inversiones
                    </h4>
                    <p className="text-xs text-slate-500">
                      Ajuste descripciones, justificación técnica del ítem, cantidades o recalcule valores unitarios en CLP.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEditModalAddItem}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#da291c] hover:bg-[#b81e13] px-3.5 py-1.5 rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Ítem</span>
                  </button>
                </div>

                {/* 4 Explicit Column Headers for Edit Modal */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-lg border border-[#d2d2d2] mb-2 tracking-wide">
                  <div className="col-span-4">Detalle</div>
                  <div className="col-span-3">Justificación</div>
                  <div className="col-span-1 text-center">Cantidad</div>
                  <div className="col-span-2 text-right">Precio Unitario en CLP IVA Incluido</div>
                  <div className="col-span-1 text-right">Subtotal</div>
                  <div className="col-span-1 text-center">Acción</div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {editItems.map((item, index) => {
                    const q = parseInt(String(item.quantity).replace(/\D/g, ''), 10) || 0;
                    const p = parseInt(String(item.unitPriceCLP).replace(/\D/g, ''), 10) || 0;
                    const rowSubtotal = q * p;

                    return (
                      <div
                        key={item.id || index}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-slate-50/70 hover:bg-white rounded-lg border border-[#d2d2d2] items-center shadow-2xs transition-all"
                      >
                        {/* 1. Detalle */}
                        <div className="sm:col-span-4">
                          <label className="block sm:hidden text-xs font-bold text-slate-700 mb-0.5">
                            Detalle:
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Descripción del ítem"
                            value={item.description}
                            onChange={(e) => handleEditModalItemChange(index, 'description', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                          />
                        </div>

                        {/* 2. Justificación */}
                        <div className="sm:col-span-3">
                          <label className="block sm:hidden text-xs font-bold text-slate-700 mb-0.5">
                            Justificación:
                          </label>
                          <input
                            type="text"
                            placeholder="Justificación del gasto"
                            value={item.justification}
                            onChange={(e) => handleEditModalItemChange(index, 'justification', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                          />
                        </div>

                        {/* 3. Cantidad */}
                        <div className="sm:col-span-1">
                          <label className="block sm:hidden text-xs font-bold text-slate-700 mb-0.5">
                            Cantidad:
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.quantity}
                            onChange={(e) => handleEditModalItemChange(index, 'quantity', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-center font-bold font-tabular text-slate-900 focus:border-[#da291c]"
                          />
                        </div>

                        {/* 4. Precio Unitario en CLP IVA Incluido */}
                        <div className="sm:col-span-2">
                          <label className="block sm:hidden text-xs font-bold text-slate-700 mb-0.5">
                            Precio Unitario en CLP IVA Incluido:
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="0"
                            value={item.unitPriceCLP}
                            onChange={(e) => handleEditModalItemChange(index, 'unitPriceCLP', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-right font-bold font-tabular text-slate-900 focus:border-[#da291c]"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="sm:col-span-1 text-right font-tabular text-sm font-bold text-slate-900 whitespace-nowrap">
                          <span className="sm:hidden text-xs text-slate-500 mr-1">Subtotal:</span>
                          {formatCLP(rowSubtotal)}
                        </div>

                        {/* Acción */}
                        <div className="sm:col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleEditModalRemoveItem(index)}
                            disabled={editItems.length === 1}
                            className="p-1.5 text-slate-400 hover:text-[#da291c] hover:bg-rose-50 rounded disabled:opacity-20 cursor-pointer"
                            title="Eliminar ítem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3.5 bg-slate-50 rounded-lg flex items-center justify-between border-2 border-[#da291c]">
                  <span className="text-sm font-bold text-slate-900">Nuevo Presupuesto Formulado Total (CLP):</span>
                  <span className="text-xl font-extrabold font-tabular text-[#da291c]">
                    {formatCLP(
                      editItems.reduce((acc, it) => {
                        const q = parseInt(String(it.quantity).replace(/\D/g, ''), 10) || 0;
                        const p = parseInt(String(it.unitPriceCLP).replace(/\D/g, ''), 10) || 0;
                        return acc + q * p;
                      }, 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#d2d2d2]">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-[#da291c] hover:bg-[#b81e13] rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios de Proyecto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fijar / Cambiar Fecha de Cierre de Planificación (Paola / Director) */}
      {isDateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-[#0F294A] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5 h-5 text-blue-300" />
                <h3 className="text-base font-bold text-white">Fijar Fecha de Cierre de Planificación</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDateModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDeadlineDate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Nueva Fecha Límite de Formulación:
                </label>
                <input
                  type="date"
                  required
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                <p className="text-xs text-slate-600 mt-2 font-medium">
                  Fecha seleccionada: <strong className="text-blue-900">{formatDateSpanish(tempDate)}</strong>
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-950 leading-relaxed">
                Al vencer esta fecha o al activar el bloqueo manual, los técnicos de área ya no podrán ingresar nuevos proyectos ni modificar ítems presupuestarios.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Fecha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
