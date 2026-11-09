import React, { useState, useEffect, useMemo } from 'react';
import { Project, Role, Area, AreaTransfer, BudgetItem } from '../types/budget';
import { formatCLP, MONTH_NAMES, AREA_CONFIG, OFFICIAL_ACCOUNTS, getAccountByCode } from '../utils/formatters';
import { useCatalog } from '../CatalogContext';
import { 
  getApreRecords, 
  getActiveApreRecords,
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
  Coins,
  PlusCircle,
  Plus,
  Trash2,
  Zap
} from 'lucide-react';

interface Stage4GimnasiaMonetariaProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  onAddProject?: (project: Project) => void;
  currentRole: Role;
  onGoToNextStage: () => void;
  currentFiscalYear?: number;
}

export const Stage4GimnasiaMonetaria: React.FC<Stage4GimnasiaMonetariaProps> = ({
  projects,
  onUpdateProject,
  onAddProject,
  currentRole,
  onGoToNextStage,
  currentFiscalYear = 2026,
}) => {
  const { areas, tecnicos } = useCatalog();
  // 1. APRE Records and Transfers state scoped to current fiscal year (only active non-excluded records)
  const [apreRecords, setApreRecords] = useState(() => getActiveApreRecords(currentFiscalYear));
  const [transfers, setTransfers] = useState<AreaTransfer[]>(() => getAreaTransfers(currentFiscalYear));

  // Re-sync when switching fiscal year
  useEffect(() => {
    setApreRecords(getActiveApreRecords(currentFiscalYear));
    setTransfers(getAreaTransfers(currentFiscalYear));
  }, [currentFiscalYear]);

  // Load from Supabase on mount if configured
  useEffect(() => {
    if (isSupabaseConfigured()) {
      // Sincronizar APRE desde Supabase
      fetchApreRecordsFromDatabase().then((dbApre) => {
        if (dbApre && dbApre.length > 0) {
          setApreRecords(dbApre.filter((r) => !r.excluded));
        }
      });

      // Sincronizar Transferencias desde Supabase
      fetchAreaTransfersFromDatabase().then((dbTransfers) => {
        if (dbTransfers && dbTransfers.length > 0) {
          setTransfers(dbTransfers);
        }
      });
    }
  }, [currentFiscalYear]);

  // Filter and Search states
  const [filterStatus, setFilterStatus] = useState<'all' | 'financed' | 'blocked' | 'paused' | 'running'>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

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

  // Modal 4: Proyecto No Presupuestado (Extrapresupuestario)
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraTitle, setExtraTitle] = useState('');
  const [extraDestino, setExtraDestino] = useState('');
  const [extraArea, setExtraArea] = useState<Area>('Redes');
  const [extraResponsible, setExtraResponsible] = useState<string>('Cristian');
  const [extraUnidadFinanciadora, setExtraUnidadFinanciadora] = useState<string>('Dirección TIC Sede Talca');
  const [extraJustification, setExtraJustification] = useState('');
  const [extraItems, setExtraItems] = useState<Array<{
    description: string;
    justification: string;
    quantity: string | number;
    unitPriceCLP: string | number;
  }>>([
    { description: '', justification: '', quantity: '1', unitPriceCLP: '' },
  ]);

  // PARTE 1: Decision Panel State (Macro)
  const [isDecisionPanelOpen, setIsDecisionPanelOpen] = useState(true);

  // PARTE 2: Auto-Assign Report Log Modal State (Micro)
  const [autoAssignReport, setAutoAssignReport] = useState<{
    project: string;
    item: string;
    status: 'success' | 'failed';
    pres?: string;
    amount?: number;
    reason?: string;
  }[]>([]);
  const [isAutoAssignModalOpen, setIsAutoAssignModalOpen] = useState(false);

  // Recalculate account balances when apreRecords, transfers or projects change
  const accountBalances = calculateAccountBalances(apreRecords, transfers, projects);

  // Evaluate all projects against APRE balances
  const evaluationsMap = new Map<string, ProjectFinancingEvaluation>();
  projects.forEach((proj) => {
    evaluationsMap.set(proj.id, evaluateProjectFinancing(proj, accountBalances, apreRecords, projects, currentFiscalYear));
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

  // PARTE 1: Blocked projects requiring readecuación
  const blockedProjects = projects.filter((proj) => {
    const isPaused = proj.executionStatus === 'Pausado' || proj.pausedInPostCut;
    const isRunning = proj.executionStatus === 'En Plazo' || proj.executionStatus === 'Completado';
    const evalData = evaluationsMap.get(proj.id);
    return !evalData?.isFinanced && !isPaused && !isRunning;
  });

  // Extract account deficits for each blocked project
  const getProjectAccountDeficits = (proj: Project) => {
    const evalData = evaluationsMap.get(proj.id);
    if (!evalData) return [];
    const map = new Map<string, { accountCode: string; accountName: string; deficit: number }>();

    evalData.itemsEvaluation.forEach((it) => {
      if (!it.isCovered && it.gapCLP > 0) {
        const existing = map.get(it.accountCode);
        if (existing) {
          existing.deficit += it.gapCLP;
        } else {
          map.set(it.accountCode, {
            accountCode: it.accountCode,
            accountName: it.accountName,
            deficit: it.gapCLP,
          });
        }
      }
    });

    if (map.size === 0 && evalData.bottlenecks && evalData.bottlenecks.length > 0) {
      evalData.bottlenecks.forEach((b) => {
        const acc = b.accountCode || '1203102';
        const existing = map.get(acc);
        if (existing) {
          existing.deficit += b.deficitCLP;
        } else {
          map.set(acc, {
            accountCode: acc,
            accountName: b.accountName || getAccountByCode(acc)?.name || acc,
            deficit: b.deficitCLP,
          });
        }
      });
    }

    return Array.from(map.values());
  };

  // Global deficits grouped by accounting account
  const globalAccountDeficits = new Map<string, number>();
  blockedProjects.forEach((proj) => {
    const deficits = getProjectAccountDeficits(proj);
    deficits.forEach((d) => {
      globalAccountDeficits.set(
        d.accountCode,
        (globalAccountDeficits.get(d.accountCode) || 0) + d.deficit
      );
    });
  });

  // Accounts used across all projects in the current fiscal year
  const usedAccountCodes = Array.from(
    new Set([
      ...projects.flatMap((p) => p.items.map((it) => it.accountCode || '1203102')),
      ...Array.from(globalAccountDeficits.keys()),
    ])
  ).filter(Boolean).sort();

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

  // Active Project for Detail View (Master-Detail)
  const selectedProject = useMemo(() => {
    if (selectedProjectId) {
      const found = filteredProjects.find((p) => p.id === selectedProjectId);
      if (found) return found;
    }
    return null;
  }, [filteredProjects, selectedProjectId]);

  // Group Projects by Area for Navigation Panel
  const projectsByArea = useMemo(() => {
    const map = new Map<Area, Project[]>();
    filteredProjects.forEach((p) => {
      const list = map.get(p.area) || [];
      list.push(p);
      map.set(p.area, list);
    });
    return Array.from(map.entries());
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
    saveAreaTransfers(nextTransfers, currentFiscalYear);

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
    saveAreaTransfers(nextTransfers, currentFiscalYear);

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

  // Handler: Assign PRES to an Item
  const handleAssignItemPres = (
    project: Project,
    itemId: string,
    newPresCode: string
  ) => {
    const updatedItems = project.items.map((it) => {
      if (it.id !== itemId) return it;

      if (!newPresCode) {
        return {
          ...it,
          aprePresCodigo: undefined,
          apreApprovedCLP: 0,
        };
      }

      // Find the PRES record
      const presRec = apreRecords.find((r) => !r.excluded && r.codigoPres === newPresCode);
      const remainingPresSaldo = presRec ? presRec.saldo : 0;
      const suggestedAmount = Math.min(it.totalPriceCLP, remainingPresSaldo);

      return {
        ...it,
        aprePresCodigo: newPresCode,
        apreApprovedCLP: it.apreApprovedCLP && it.apreApprovedCLP > 0 ? it.apreApprovedCLP : suggestedAmount,
      };
    });

    onUpdateProject({
      ...project,
      items: updatedItems,
    });
  };

  // Handler: Update Item PRES assigned amount
  const handleUpdateItemPresAmount = (
    project: Project,
    itemId: string,
    newAmount: number
  ) => {
    const updatedItems = project.items.map((it) => {
      if (it.id !== itemId) return it;
      return {
        ...it,
        apreApprovedCLP: Math.max(0, newAmount),
      };
    });

    onUpdateProject({
      ...project,
      items: updatedItems,
    });
  };

  // Handler: Auto-Asignar PRES a todos los ítems de todos los proyectos
  const handleAutoAssignPres = () => {
    // PARTE 2: Limpiar y preparar reporte de auto-asignación
    const report: {
      project: string;
      item: string;
      status: 'success' | 'failed';
      pres?: string;
      amount?: number;
      reason?: string;
    }[] = [];

    // 1. Crear una copia temporal de los saldos de apreRecords para no sobre-asignar
    const tempApre = apreRecords.map((r) => ({
      ...r,
      saldo: Number(r.saldo) || 0,
    }));

    // 2. Iterar sobre todos los proyectos
    projects.forEach((proj) => {
      let projectModified = false;

      const updatedItems = proj.items.map((item) => {
        const itemCost = item.totalPriceCLP || (item.quantity * item.unitPriceCLP) || 0;
        if (itemCost <= 0) return item;

        const targetAccount = String(item.accountCode || '').trim();

        // Buscar un registro en la copia temporal de apreRecords donde !excluded, saldo > 0, y codigoCuenta === item.accountCode
        const candidates = tempApre.filter(
          (r) =>
            !r.excluded &&
            r.saldo > 0 &&
            (targetAccount ? String(r.codigoCuenta).trim() === targetAccount : true)
        );

        if (candidates.length === 0) {
          report.push({
            project: proj.code,
            item: item.description,
            status: 'failed',
            reason: 'Sin saldo en la cuenta',
          });
          return item;
        }

        // Preferir el registro que alcance para financiar el ítem completo, o el de mayor saldo disponible
        const chosenRecord =
          candidates.find((r) => r.saldo >= itemCost) ||
          [...candidates].sort((a, b) => b.saldo - a.saldo)[0];

        if (!chosenRecord) {
          report.push({
            project: proj.code,
            item: item.description,
            status: 'failed',
            reason: 'Sin saldo en la cuenta',
          });
          return item;
        }

        const allocatedAmount = Math.min(itemCost, chosenRecord.saldo);
        chosenRecord.saldo -= allocatedAmount;
        projectModified = true;

        // Registrar asignación exitosa en reporte
        report.push({
          project: proj.code,
          item: item.description,
          status: 'success',
          pres: chosenRecord.codigoPres,
          amount: allocatedAmount,
        });

        return {
          ...item,
          accountCode: item.accountCode || chosenRecord.codigoCuenta,
          aprePresCodigo: chosenRecord.codigoPres,
          apreApprovedCLP: allocatedAmount,
        };
      });

      if (projectModified) {
        onUpdateProject({
          ...proj,
          items: updatedItems,
        });
      }
    });

    // Guardar reporte y abrir modal de log
    setAutoAssignReport(report);
    setIsAutoAssignModalOpen(true);

    // 3. Notificación toast
    triggerNotification(
      'Se han auto-asignado PRES a todos los ítems posibles. Revisa los proyectos que aún sigan en rojo (por falta de saldo)'
    );
  };

  // Handler: Execute Play Authorization ("🚀 DAR PLAY")
  const handleConfirmPlay = async () => {
    if (!playConfirmProject) return;

    const isExternal =
      playConfirmProject.unidadFinanciadora &&
      !playConfirmProject.unidadFinanciadora.includes('Dirección TIC');

    if (isExternal) {
      const updatedProject: Project = {
        ...playConfirmProject,
        executionStatus: 'En Plazo',
        progressPercentage: Math.max(5, playConfirmProject.progressPercentage),
        directorNotes: `${playConfirmProject.directorNotes ? playConfirmProject.directorNotes + ' · ' : ''}[PLAY] Autorizado con fondos de ${playConfirmProject.unidadFinanciadora} (${new Date().toLocaleDateString('es-CL')}). Sin descuento de APRE Dirección TIC.`,
      };

      onUpdateProject(updatedProject);
      const projectCode = playConfirmProject.code;
      setPlayConfirmProject(null);

      triggerNotification(
        `🌐 ¡Proyecto ${projectCode} autorizado e iniciado con fondos de ${playConfirmProject.unidadFinanciadora}! No se descontó dinero de APRE TIC. Pasando a Etapa 5.`
      );
      return;
    }

    const { updatedRecords, updatedProject } = authorizeProjectPlay(playConfirmProject, currentFiscalYear);
    setApreRecords(updatedRecords.filter((r) => !r.excluded));
    onUpdateProject(updatedProject);

    if (isSupabaseConfigured()) {
      await saveApreRecordsToDatabase(updatedRecords);
    }

    const projectCode = playConfirmProject.code;
    setPlayConfirmProject(null);

    triggerNotification(
      `🚀 ¡Proyecto ${projectCode} autorizado e iniciado exitosamente! Saldo descontado de APRE y guardado en Supabase. Pasando a Etapa 5.`
    );
  };

  // Handlers for Extra Project Modal (Multiple Items)
  const handleOpenExtraModal = () => {
    setExtraTitle('');
    setExtraDestino('');
    setExtraArea((areas[0]?.name as Area) || 'Redes');
    setExtraResponsible(tecnicos[0]?.name || (currentRole === 'coordinador' ? 'Paola' : 'Cristian'));
    setExtraUnidadFinanciadora('Dirección TIC Sede Talca');
    setExtraJustification('');
    setExtraItems([{ description: '', justification: '', quantity: '1', unitPriceCLP: '' }]);
    setIsExtraModalOpen(true);
  };

  const handleAddExtraItemRow = () => {
    setExtraItems([...extraItems, { description: '', justification: '', quantity: '1', unitPriceCLP: '' }]);
  };

  const handleRemoveExtraItemRow = (index: number) => {
    if (extraItems.length === 1) return;
    setExtraItems(extraItems.filter((_, i) => i !== index));
  };

  const handleExtraItemChange = (
    index: number,
    field: 'description' | 'justification' | 'quantity' | 'unitPriceCLP',
    value: string
  ) => {
    const updated = [...extraItems];
    updated[index] = { ...updated[index], [field]: value };
    setExtraItems(updated);
  };

  const calculateExtraItemsTotal = () => {
    return extraItems.reduce((acc, it) => {
      const q = parseInt(String(it.quantity).replace(/\D/g, ''), 10) || 0;
      const p = parseInt(String(it.unitPriceCLP).replace(/\D/g, ''), 10) || 0;
      return acc + q * p;
    }, 0);
  };

  // Handler: Create Extrapresupuestario Project
  const handleCreateExtrapresupuestario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraTitle.trim() || !extraDestino.trim() || !extraJustification.trim()) {
      alert('Por favor complete el nombre, destino y justificación de urgencia del proyecto.');
      return;
    }

    const validItems: BudgetItem[] = extraItems
      .filter((it) => it.description.trim() !== '')
      .map((it, idx) => {
        const q = Math.max(1, parseInt(String(it.quantity).replace(/\D/g, ''), 10) || 1);
        const p = Math.max(0, parseInt(String(it.unitPriceCLP).replace(/\D/g, ''), 10) || 0);
        return {
          id: `item-extra-${Date.now()}-${idx}`,
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
    const extraProjectCount = projects.filter((p) => p.isExtrapresupuestario).length;
    const finalArea = (extraArea || (areas[0]?.name as Area) || 'Redes') as Area;
    const finalResp = extraResponsible.trim() || (tecnicos[0]?.name || 'Cristian');

    const newProject: Project = {
      id: `proj-extra-${Date.now()}`,
      code: `TIC-TAL-${currentFiscalYear}-EXTRA-${String(extraProjectCount + 1).padStart(2, '0')}`,
      fiscalYear: currentFiscalYear,
      title: extraTitle.trim(),
      area: finalArea,
      responsible: finalResp,
      estimatedStartMonth: new Date().getMonth() + 1,
      justification: extraJustification.trim(),
      reviewStatus: 'Aprobado',
      directorNotes: `Proyecto No Presupuestado (Extrapresupuestario) aprobado en Etapa 4. Unidad Financiadora: ${extraUnidadFinanciadora}.`,
      items: validItems,
      requestedBudgetCLP: projectTotal,
      approvedCeilingCLP: projectTotal,
      executedBudgetCLP: 0,
      progressPercentage: 0,
      executionStatus: 'No Iniciado',
      isExtrapresupuestario: true,
      bitacora: [],
      destino: extraDestino.trim(),
      unidadFinanciadora: extraUnidadFinanciadora,
    };

    if (onAddProject) {
      onAddProject(newProject);
    }
    onUpdateProject(newProject);

    setIsExtraModalOpen(false);
    triggerNotification(`Proyecto No Presupuestado "${newProject.code} - ${newProject.title}" creado con éxito.`);
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
            {/* Quick Action: Auto-Asignar PRES (Only for director or coordinador) */}
            {(currentRole === 'director' || currentRole === 'coordinador') && (
              <button
                onClick={handleAutoAssignPres}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-base cursor-pointer ring-1 ring-emerald-500/40"
                title="Asignar automáticamente PRES a todos los ítems de los proyectos respetando saldos disponibles"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>⚡ Auto-Asignar PRES</span>
              </button>
            )}

            {/* Quick Action: Transfer Balance between Areas */}
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-2 bg-[#ff6900] hover:bg-[#e05c00] text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-base cursor-pointer"
              title="Mover sobrantes de saldo entre áreas en una misma cuenta contable"
            >
              <ArrowRightLeft className="w-4 h-4 text-white" />
              <span>Transferir Saldo entre Áreas</span>
            </button>

            {/* Quick Action: + Proyecto No Presupuestado */}
            {(currentRole === 'director' || currentRole === 'coordinador') && (
              <button
                onClick={handleOpenExtraModal}
                className="flex items-center gap-2 bg-[#000000] hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-base cursor-pointer border border-slate-700 hover:border-[#da291c]"
                title="Registrar requerimiento imprevisto o contingencia presupuestaria"
              >
                <PlusCircle className="w-4 h-4 text-[#da291c]" />
                <span>+ Proyecto No Presupuestado</span>
              </button>
            )}

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
              Listos para Iniciar Ejecución 🚀
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

      {/* PARTE 1: Panel de Decisión y Readecuación (Macro) - Roles director y coordinador */}
      {(currentRole === 'director' || currentRole === 'coordinador') && (
        <section aria-label="Panel de Decisión y Readecuación" className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Header colapsable */}
          <button
            type="button"
            onClick={() => setIsDecisionPanelOpen((prev) => !prev)}
            className="w-full px-6 py-4 bg-slate-900 text-white flex items-center justify-between hover:bg-slate-800 transition-colors cursor-pointer border-b-2 border-[#da291c]"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🎯</span>
              <div className="text-left">
                <h3 className="text-lg font-bold">🎯 Panel de Decisión y Readecuación</h3>
                <p className="text-xs text-slate-300">
                  Saldos globales consolidados por cuenta y déficits activos de proyectos bloqueados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {totalBloqueadosCount > 0 ? (
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {totalBloqueadosCount} {totalBloqueadosCount === 1 ? 'Proyecto Bloqueado' : 'Proyectos Bloqueados'}
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ✓ 100% Financiado
                </span>
              )}
              {isDecisionPanelOpen ? (
                <ChevronUp className="w-5 h-5 text-slate-300" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-300" />
              )}
            </div>
          </button>

          {isDecisionPanelOpen && (
            <div className="p-6 space-y-6">
              {/* Tabla de cuentas contables utilizadas */}
              <div>
                <div className="mb-4">
                  <h4 className="text-base font-bold text-slate-900 flex items-center justify-between">
                    <span>Saldos Globales y Brechas por Cuenta</span>
                    <span className="text-xs font-normal text-slate-500">
                      {usedAccountCodes.length} {usedAccountCodes.length === 1 ? 'cuenta contable registrada' : 'cuentas contables registradas'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    El "Saldo" es el monto real disponible en APRE. La "Brecha" es el dinero faltante para financiar los proyectos bloqueados de esa cuenta.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Cuenta</th>
                        <th className="py-2.5 px-4 text-right">Saldo Disponible APRE</th>
                        <th className="py-2.5 px-4 text-right">Brecha de Financiamiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {usedAccountCodes.map((accCode) => {
                        const accInfo = accountBalances.get(accCode);
                        const accName = accInfo?.accountName || getAccountByCode(accCode)?.name || accCode;
                        const available = accInfo?.availableBalance || 0;
                        const deficit = globalAccountDeficits.get(accCode) || 0;
                        const hasDeficit = deficit > 0;
                        const isExpanded = expandedAccount === accCode;

                        // Calcular el desglose por área para esta cuenta
                        const projectsInAccount = projects.filter(p => p.items.some(it => String(it.accountCode) === accCode));
                        const areaBreakdown = ['Usuarios', 'Laboratorios', 'Salas de Clases', 'Redes', 'Salones de Eventos', 'Salas Especiales', 'CCTV']
                          .map(area => {
                            const areaProjects = projectsInAccount.filter(p => p.area === area);
                            const allocated = areaProjects.reduce((sum, p) => sum + p.items.filter(it => String(it.accountCode) === accCode).reduce((s, it) => s + (it.apreApprovedCLP || 0), 0), 0);
                            const gap = areaProjects.reduce((sum, p) => {
                              const evalData = evaluationsMap.get(p.id);
                              return sum + (evalData?.bottlenecks.filter(b => b.accountCode === accCode).reduce((s, b) => s + b.deficitCLP, 0) || 0);
                            }, 0);
                            return { area, allocated, gap, total: allocated + gap };
                          }).filter(a => a.allocated > 0 || a.gap > 0);

                        return (
                          <React.Fragment key={accCode}>
                            {/* Fila Principal (Clickable) */}
                            <tr
                              onClick={() => setExpandedAccount(isExpanded ? null : accCode)}
                              className={`cursor-pointer transition-colors ${
                                hasDeficit
                                  ? 'bg-rose-50/80 hover:bg-rose-100/70 border-l-4 border-l-rose-500'
                                  : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                  {hasDeficit && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                                  <div>
                                    <span className="font-mono font-bold text-slate-900">{accCode}</span>
                                    <span className="text-slate-600 text-xs ml-2">· {accName}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-tabular font-bold text-slate-900 whitespace-nowrap">
                                {formatCLP(available)}
                              </td>
                              <td className={`py-3 px-4 text-right font-tabular font-bold whitespace-nowrap ${
                                hasDeficit ? 'text-rose-700' : 'text-slate-400'
                              }`}>
                                {hasDeficit ? `-${formatCLP(deficit)}` : '$0'}
                              </td>
                            </tr>

                            {/* Sub-filas de Desglose por Área (Solo visibles si está expandido) */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={3} className="p-0 border-b border-slate-200 bg-slate-50/50">
                                  <div className="pl-10 pr-4 py-3 space-y-2">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">Desglose por Área</div>
                                    {areaBreakdown.length === 0 ? (
                                      <p className="text-xs text-slate-500">No hay proyectos asociados a esta cuenta.</p>
                                    ) : (
                                      areaBreakdown.map((ab) => (
                                        <div key={ab.area} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100 last:border-0">
                                          <span className="font-medium text-slate-700">{ab.area}</span>
                                          <div className="flex gap-4 sm:gap-6">
                                            <span className="text-slate-500 text-xs">Total Asignado: <strong className="text-blue-800">{formatCLP(ab.total)}</strong></span>
                                            <span className="text-slate-500 text-xs">Comprometido: <strong className="text-slate-800">{formatCLP(ab.allocated)}</strong></span>
                                            <span className="text-slate-500 text-xs">Falta: <strong className={ab.gap > 0 ? "text-rose-600" : "text-emerald-600"}>{formatCLP(ab.gap)}</strong></span>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumen de proyectos en 🔴 SIN FINANCIAMIENTO */}
              {totalBloqueadosCount > 0 ? (
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-rose-50/80 p-3.5 rounded-lg border border-rose-200">
                  <div className="flex items-center gap-2 font-semibold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Hay <strong>{totalBloqueadosCount}</strong> {totalBloqueadosCount === 1 ? 'proyecto' : 'proyectos'} en 🔴 Sin Financiamiento. Seleccione cualquiera de ellos en el panel inferior para gestionar su readecuación y transferencias.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus('blocked');
                      const firstBlocked = projects.find((p) => {
                        const evalData = evaluationsMap.get(p.id);
                        const isPaused = p.executionStatus === 'Pausado' || p.pausedInPostCut;
                        const isRunning = p.executionStatus === 'En Plazo' || p.executionStatus === 'Completado';
                        return !evalData?.isFinanced && !isPaused && !isRunning;
                      });
                      if (firstBlocked) setSelectedProjectId(firstBlocked.id);
                    }}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
                  >
                    Ver Proyectos Bloqueados
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-200 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Excelente! No hay proyectos bloqueados. Todos los proyectos en cartera cuentan con saldo asignado en APRE.</span>
                </div>
              )}
            </div>
          )}
        </section>
      )}

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

      {/* Main Grid: Projects Master-Detail (Split View) */}
      {projects.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Scale className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Aún no hay proyectos en cartera para el ejercicio {currentFiscalYear}
          </h3>
          <p className="text-base text-slate-600 mb-4 max-w-md mx-auto">
            La bolsa de proyectos y readecuación presupuestaria se activará cuando existan iniciativas formuladas en la Etapa 1.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Columna Izquierda (md:col-span-1): Panel de Navegación de Proyectos */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs md:col-span-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Proyectos en Cartera</h3>
                <p className="text-[11px] text-slate-500">Seleccione para ver detalle</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {filteredProjects.length}
              </span>
            </div>

            {/* Scroll independiente */}
            <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-1 space-y-4">
              {projectsByArea.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center italic">
                  No se encontraron proyectos con los filtros seleccionados.
                </p>
              ) : (
                projectsByArea.map(([areaName, areaProjects]) => (
                  <div key={areaName} className="space-y-1.5">
                    <div className="flex items-center justify-between px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100/90 rounded-md border border-slate-200 uppercase tracking-wide">
                      <span>{areaName}</span>
                      <span className="text-[10px] bg-white text-slate-700 px-1.5 py-0.2 rounded-full font-bold border border-slate-200">
                        {areaProjects.length}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {areaProjects.map((proj) => {
                        const isSelected = selectedProject?.id === proj.id;
                        const evalData = evaluationsMap.get(proj.id);
                        const isFinanced = evalData?.isFinanced ?? false;
                        const isPaused = proj.executionStatus === 'Pausado' || proj.pausedInPostCut;
                        const isRunning = proj.executionStatus === 'En Plazo' || proj.executionStatus === 'Completado';

                        let statusBadge = (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            <span>🔴 Sin Fin.</span>
                          </span>
                        );

                        if (isRunning) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              <span>🚀 En Ejec.</span>
                            </span>
                          );
                        } else if (isPaused) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              <span>⏸️ Diferido</span>
                            </span>
                          );
                        } else if (isFinanced) {
                          const isExternal = proj.unidadFinanciadora && !proj.unidadFinanciadora.includes('Dirección TIC');
                          statusBadge = isExternal ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                              <span>🌐 Fin. Ext.</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>🟢 Financiado</span>
                            </span>
                          );
                        }

                        return (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => setSelectedProjectId(proj.id)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/40 font-semibold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                                {proj.code}
                              </span>
                              {statusBadge}
                            </div>
                            <p className="text-xs font-bold truncate leading-tight text-slate-900">
                              {proj.title}
                            </p>
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 text-[11px]">
                              <span className="text-slate-500 font-medium">{proj.items.length} ítems</span>
                              <span className="font-bold font-tabular text-slate-900">
                                {formatCLP(proj.requestedBudgetCLP)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Columna Derecha (md:col-span-3): Panel de Detalles */}
          <div className="md:col-span-3 w-full min-w-0">
            {!selectedProject ? (
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-16 text-center shadow-xs flex flex-col items-center justify-center min-h-[380px]">
                <Scale className="w-12 h-12 text-slate-400 mb-3" />
                <h4 className="text-lg font-bold text-slate-800">
                  Seleccione un proyecto del panel izquierdo para ver su desglose y gestionar su financiamiento.
                </h4>
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                  En este panel podrá revisar las brechas presupuestarias, asignar códigos PRES a cada ítem, transferir saldo entre áreas o iniciar la ejecución.
                </p>
              </div>
            ) : (() => {
              const project = selectedProject;
              const evalData = evaluationsMap.get(project.id);
              const isFinanced = evalData?.isFinanced ?? false;
              const isPaused = project.executionStatus === 'Pausado' || project.pausedInPostCut;
              const isRunning = project.executionStatus === 'En Plazo' || project.executionStatus === 'Completado';
              const areaStyle = AREA_CONFIG[project.area] || AREA_CONFIG['Salas Especiales'];

              return (
                <div
                  key={project.id}
                  className={`bg-white border rounded-xl overflow-hidden shadow-xs border-l-4 w-full ${
                    isRunning 
                      ? 'border-l-blue-600'
                      : isPaused 
                      ? 'border-l-amber-500 opacity-90'
                      : isFinanced 
                      ? (project.unidadFinanciadora && !project.unidadFinanciadora.includes('Dirección TIC') ? 'border-l-blue-500' : 'border-l-emerald-500') 
                      : 'border-l-rose-500'
                  }`}
                >
                  {/* Project Header Bar */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70 border-b border-slate-200">
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

                      <h3 className="text-xl font-bold text-slate-900 leading-snug">
                        {project.title}
                      </h3>
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
                          project.unidadFinanciadora && !project.unidadFinanciadora.includes('Dirección TIC') ? (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-100 text-blue-950 font-bold text-sm border border-blue-300 shadow-2xs">
                              <span>🌐 FINANCIAMIENTO EXTERNO</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-950 font-bold text-sm border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                              <span>🟢 FINANCIADO</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-100 text-rose-950 font-bold text-sm border border-rose-300 shadow-2xs">
                            <AlertTriangle className="w-4 h-4 text-rose-700" />
                            <span>🔴 SIN FINANCIAMIENTO</span>
                          </span>
                        )}
                      </div>

                      {/* PLAY BUTTON (Only if Financed) or Defer/Reactivate Button */}
                      <div className="flex items-center gap-2">
                        {!isRunning && !isPaused && (
                          <button
                            type="button"
                            disabled={!isFinanced}
                            onClick={() => {
                              if (!isFinanced) return;
                              setPlayConfirmProject(project);
                            }}
                            className={`flex items-center gap-2 font-extrabold px-4 py-2.5 rounded-lg shadow-md transition-all text-sm ${
                              isFinanced
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white hover:shadow-lg cursor-pointer ring-2 ring-emerald-500/50'
                                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                            }`}
                            title={
                              isFinanced
                                ? 'Autorizar fondos en APRE e iniciar ejecución técnica'
                                : 'Proyecto sin financiamiento completo. Todos los ítems deben tener asignado un PRES con saldo disponible suficiente.'
                            }
                          >
                            <Play className={`w-4 h-4 ${isFinanced ? 'fill-white' : 'fill-slate-400 text-slate-400'}`} />
                            <span>🚀 Iniciar Ejecución</span>
                          </button>
                        )}

                        {/* Defer or Reactivate Project */}
                        {!isRunning && (
                          <button
                            type="button"
                            onClick={() => handleToggleDeferProject(project)}
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
                  <div className="p-6 space-y-6">
                    {/* Bottleneck Alert Box if Sin Financiamiento */}
                    {!isFinanced && !isPaused && evalData?.bottlenecks && evalData.bottlenecks.length > 0 && (
                      <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-rose-900 font-bold text-base">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>Detalle de Brecha Presupuestaria frente a Cuentas APRE</span>
                        </div>
                        <div className="space-y-2">
                          {evalData.bottlenecks.map((b, bIdx) => (
                            <div
                              key={b.itemId ? `item-${b.itemId}` : `${b.accountCode}-${b.presCodigo || 'pres'}-${bIdx}`}
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
                          Evaluado en tiempo real contra registros APRE {currentFiscalYear}
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase">
                            <tr>
                              <th className="py-3 px-3">Descripción del Ítem</th>
                              <th className="py-3 px-3 text-center w-16">Cant</th>
                              <th className="py-3 px-3 text-right w-28">Subtotal CLP</th>
                              <th className="py-3 px-3 min-w-[200px]">Cuenta Contable</th>
                              <th className="py-3 px-3 min-w-[300px]">PRES que Financia & Monto Asignado</th>
                              <th className="py-3 px-3 text-center w-28">Cobertura</th>
                              <th className="py-3 px-3 text-center w-24">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-xs">
                            {evalData?.itemsEvaluation.map(({ item, accountCode, accountName, itemCost, isCovered, gapCLP }) => {
                              const matchingPresRecords = apreRecords.filter(
                                (r) =>
                                  !r.excluded &&
                                  (!item.accountCode || String(r.codigoCuenta).trim() === String(item.accountCode).trim()) &&
                                  (r.saldo > 0 || String(r.codigoPres) === String(item.aprePresCodigo))
                              );

                              return (
                                <tr key={item.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-3 align-middle">
                                    <p className="font-bold text-slate-900 text-sm leading-snug">
                                      {item.description}
                                    </p>
                                    {item.justification && (
                                      <p className="text-xs text-slate-500 italic mt-0.5">
                                        {item.justification}
                                      </p>
                                    )}
                                    <p className="text-xs text-slate-500 font-tabular mt-0.5">
                                      Costo Unitario: {formatCLP(item.unitPriceCLP)}
                                    </p>
                                  </td>

                                  <td className="py-3 px-3 align-middle text-center font-tabular font-bold text-slate-800 text-sm">
                                    {item.quantity}
                                  </td>

                                  <td className="py-3 px-3 align-middle text-right font-tabular font-bold text-slate-900 whitespace-nowrap text-sm">
                                    {formatCLP(itemCost)}
                                  </td>

                                  <td className="py-3 px-3 align-middle">
                                    <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mr-1.5">
                                      {accountCode}
                                    </span>
                                    <span className="font-semibold text-slate-800 text-xs block mt-1">
                                      {accountName}
                                    </span>
                                  </td>

                                  {/* Selector de PRES y Monto Asignado */}
                                  <td className="py-3 px-3 align-middle min-w-[300px]">
                                    {project.unidadFinanciadora && !project.unidadFinanciadora.includes('Dirección TIC') ? (
                                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-900 font-semibold shadow-2xs">
                                        <span>🌐 Financiado por {project.unidadFinanciadora} (Sin cargo a APRE)</span>
                                      </div>
                                    ) : matchingPresRecords.length === 0 ? (
                                      <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-semibold shadow-xs">
                                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                        <span>No hay PRES importados para esta cuenta. Ve a Etapa 3.</span>
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5">
                                        <select
                                          value={item.aprePresCodigo || ''}
                                          onChange={(e) => handleAssignItemPres(project, item.id, e.target.value)}
                                          className={`w-full p-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                                            item.aprePresCodigo
                                              ? 'bg-white border-blue-400 text-slate-900 font-semibold'
                                              : 'bg-amber-50/70 border-amber-300 text-amber-900 font-medium'
                                          }`}
                                        >
                                          <option value="">-- Seleccionar PRES --</option>
                                          {matchingPresRecords.map((r) => (
                                            <option key={r.codigoPres} value={r.codigoPres}>
                                              {r.codigoPres} — {r.detalle.length > 28 ? r.detalle.slice(0, 28) + '...' : r.detalle} — Disp: {formatCLP(r.saldo)}
                                            </option>
                                          ))}
                                        </select>

                                        {item.aprePresCodigo && (
                                          <div className="flex items-center justify-between gap-2 pt-0.5">
                                            <span className="text-[11px] text-slate-500 font-medium">
                                              Monto asignado:
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="number"
                                                min="0"
                                                max={item.totalPriceCLP}
                                                step="10000"
                                                value={item.apreApprovedCLP ?? 0}
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value, 10);
                                                  handleUpdateItemPresAmount(project, item.id, isNaN(val) ? 0 : val);
                                                }}
                                                className="w-28 p-1 text-xs font-bold font-tabular text-right bg-white border border-slate-300 rounded focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-900"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const presRec = apreRecords.find((r) => r.codigoPres === item.aprePresCodigo);
                                                  const maxAllowed = presRec ? Math.min(item.totalPriceCLP, presRec.saldo) : item.totalPriceCLP;
                                                  handleUpdateItemPresAmount(project, item.id, maxAllowed);
                                                }}
                                                className="text-[10px] text-blue-700 hover:text-blue-900 font-bold px-1.5 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                                                title="Asignar el total requerido o disponible"
                                              >
                                                Max
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                                    {project.unidadFinanciadora && !project.unidadFinanciadora.includes('Dirección TIC') ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 font-bold text-xs border border-blue-300">
                                        <span>🌐 100% Externo</span>
                                      </span>
                                    ) : isCovered ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300">
                                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                                        <span>Financiado</span>
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 text-rose-900 font-bold text-xs border border-rose-300"
                                        title={item.aprePresCodigo ? `Déficit de ${formatCLP(gapCLP)} en PRES ${item.aprePresCodigo}` : 'Falta asignar código PRES'}
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                                        <span>{item.aprePresCodigo ? `Déficit -${formatCLP(gapCLP)}` : 'Sin PRES'}</span>
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-3 align-middle text-center">
                                    {project.unidadFinanciadora && !project.unidadFinanciadora.includes('Dirección TIC') ? (
                                      <span className="text-[11px] text-slate-400 font-medium italic">
                                        Fondo externo
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReajustItem(project, item)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-900 border border-slate-300 hover:border-blue-400 rounded-md text-xs font-bold transition-colors cursor-pointer"
                                        title="Modificar cantidad o valor unitario para calzar con saldo APRE"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Reajustar</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Resumen de PRES usados en este proyecto */}
                      {(() => {
                        const presUsedMap = new Map<string, { presCodigo: string; accountCode: string; accountName: string; assigned: number; available: number; detail: string }>();

                        project.items.forEach((it) => {
                          if (it.aprePresCodigo && it.apreApprovedCLP && it.apreApprovedCLP > 0) {
                            const existing = presUsedMap.get(it.aprePresCodigo);
                            const rec = apreRecords.find((r) => r.codigoPres === it.aprePresCodigo);
                            const assigned = (existing?.assigned || 0) + it.apreApprovedCLP;
                            const available = rec ? rec.saldo : 0;
                            presUsedMap.set(it.aprePresCodigo, {
                              presCodigo: it.aprePresCodigo,
                              accountCode: rec?.codigoCuenta || it.accountCode || 'S/C',
                              accountName: rec?.cuentaContable || 'Cuenta',
                              detail: rec?.detalle || '',
                              assigned,
                              available,
                            });
                          }
                        });

                        const presList = Array.from(presUsedMap.values());
                        if (presList.length === 0) return null;

                        return (
                          <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                              <Coins className="w-4 h-4 text-[#da291c]" />
                              <span>Resumen de Códigos PRES Asignados a este Proyecto</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {presList.map((p) => {
                                const isExceeded = p.assigned > p.available;
                                return (
                                  <div
                                    key={p.presCodigo}
                                    className={`p-2.5 rounded-md border flex items-center justify-between ${
                                      isExceeded
                                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                                        : 'bg-white border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <div>
                                      <span className="font-mono font-bold text-slate-900 mr-1.5">PRES {p.presCodigo}</span>
                                      <span className="text-slate-500 font-medium">· Cuenta {p.accountCode}</span>
                                      <p className="text-[11px] text-slate-600 truncate max-w-[280px]">{p.detail}</p>
                                    </div>
                                    <div className="text-right whitespace-nowrap font-tabular">
                                      <span className="text-slate-500 text-[10px] block">Asignado / Disponible:</span>
                                      <span className={`font-bold ${isExceeded ? 'text-rose-700' : 'text-emerald-700'}`}>
                                        {formatCLP(p.assigned)}
                                      </span>
                                      <span className="text-slate-500 text-[10px]"> / {formatCLP(p.available)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
      {playConfirmProject && (() => {
        const isExternalConfirm = Boolean(
          playConfirmProject.unidadFinanciadora &&
          !playConfirmProject.unidadFinanciadora.includes('Dirección TIC')
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className={`bg-white rounded-xl shadow-2xl max-w-lg w-full border ${isExternalConfirm ? 'border-blue-300' : 'border-emerald-300'} overflow-hidden animate-fade-in`}>
              <div className={`${isExternalConfirm ? 'bg-blue-800' : 'bg-emerald-800'} text-white px-6 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <Play className="w-5 h-5 fill-white text-white" />
                  <h3 className="text-lg font-bold">
                    {isExternalConfirm ? 'Autorizar Proyecto (Financiamiento Externo)' : 'Autorizar e Iniciar Proyecto TIC'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPlayConfirmProject(null)}
                  className="text-white/80 hover:text-white p-1 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className={`p-4 ${isExternalConfirm ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'} rounded-lg border space-y-1`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-xs font-bold ${isExternalConfirm ? 'text-blue-900 bg-blue-200' : 'text-emerald-900 bg-emerald-200'} px-2 py-0.5 rounded`}>
                      {playConfirmProject.code}
                    </span>
                    {isExternalConfirm && (
                      <span className="text-xs font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                        🌐 Fondos Externos
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-1">
                    {playConfirmProject.title}
                  </h4>
                  <p className="text-sm font-semibold text-slate-700">
                    Responsable Técnico: <strong>{playConfirmProject.responsible}</strong>
                  </p>
                  <p className={`text-lg font-extrabold ${isExternalConfirm ? 'text-blue-900' : 'text-emerald-900'} font-tabular mt-2`}>
                    {isExternalConfirm
                      ? `Monto Financiado Externamente: ${formatCLP(playConfirmProject.requestedBudgetCLP)}`
                      : `Monto a descontar de APRE: ${formatCLP(playConfirmProject.requestedBudgetCLP)}`}
                  </p>
                </div>

                {isExternalConfirm ? (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-300 space-y-2.5">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                      <span className="text-base">🌐</span>
                      <span>Financiamiento Externo Aprobado</span>
                    </div>
                    <p className="text-sm text-blue-950 font-medium leading-relaxed">
                      Proyecto autorizado con fondos de: <strong>{playConfirmProject.unidadFinanciadora}</strong>. No se descontará presupuesto de la Dirección TIC.
                    </p>
                    <p className="text-xs text-blue-700">
                      Al confirmar, el proyecto pasará formalmente a la <strong>Etapa 5 (Ejecución y Control Técnico)</strong> para el técnico responsable en estado <strong>En Plazo</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* B3: Desglose de PRES a descontar */}
                    {(() => {
                      const presDeductionsMap = new Map<string, { presCodigo: string; accountCode: string; amount: number; detail: string; currentSaldo: number }>();
                      playConfirmProject.items.forEach((it) => {
                        const presCode = it.aprePresCodigo;
                        if (presCode) {
                          const rec = apreRecords.find((r) => r.codigoPres === presCode);
                          const existing = presDeductionsMap.get(presCode);
                          const amount = (existing?.amount || 0) + (it.apreApprovedCLP || it.totalPriceCLP);
                          presDeductionsMap.set(presCode, {
                            presCodigo: presCode,
                            accountCode: rec?.codigoCuenta || it.accountCode || 'S/C',
                            amount,
                            detail: rec?.detalle || '',
                            currentSaldo: rec ? rec.saldo : 0,
                          });
                        }
                      });

                      const deductionsList = Array.from(presDeductionsMap.values());
                      if (deductionsList.length === 0) return null;

                      return (
                        <div className="p-3 bg-white rounded-lg border border-emerald-300 space-y-2">
                          <p className="text-xs font-bold text-emerald-950 uppercase">
                            Desglose de Códigos PRES que se descontarán:
                          </p>
                          <div className="space-y-1.5 text-xs font-tabular">
                            {deductionsList.map((d) => (
                              <div key={d.presCodigo} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                                <div>
                                  <span className="font-mono font-bold text-slate-900">PRES {d.presCodigo}</span>
                                  <span className="text-slate-500 font-medium ml-1">· Cta {d.accountCode}</span>
                                  <p className="text-[11px] text-slate-600 truncate max-w-[240px]">{d.detail}</p>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-emerald-800 text-sm block">-{formatCLP(d.amount)}</span>
                                  <span className="text-[10px] text-slate-500">Saldo remanente: {formatCLP(Math.max(0, d.currentSaldo - d.amount))}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

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
                  </>
                )}

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
                    className={`px-5 py-2 text-sm font-bold rounded-lg ${isExternalConfirm ? 'bg-blue-700 hover:bg-blue-800 ring-blue-500/50' : 'bg-emerald-700 hover:bg-emerald-800 ring-emerald-500/50'} text-white shadow-md transition-colors flex items-center gap-2 cursor-pointer ring-2`}
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Confirmar e Iniciar Ejecución</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal 4: Registrar Proyecto No Presupuestado (Extrapresupuestario) */}
      {isExtraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full border border-[#d2d2d2] my-8 overflow-hidden">
            {/* Cabecera institucional negra con borde rojo #da291c */}
            <div className="bg-[#000000] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#da291c]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#da291c] text-white flex items-center justify-center font-bold text-sm tracking-wider">
                  UA
                </div>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>+ Proyecto No Presupuestado</span>
                    <span className="text-xs font-normal px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-500/40">
                      Extrapresupuestario
                    </span>
                  </h3>
                  <p className="text-xs text-[#d2d2d2]">
                    Asignación Extraordinaria o Contingencia Institucional · Ejercicio {currentFiscalYear} · Dirección TIC Sede Talca
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExtraModalOpen(false)}
                className="text-[#d2d2d2] hover:text-white p-1 rounded-md text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExtrapresupuestario} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Nombre del Proyecto <span className="text-[#da291c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={extraTitle}
                    onChange={(e) => setExtraTitle(e.target.value)}
                    placeholder="Ej: Reemplazo Urgente de UPS y Banco de Baterías Edificio Aulario Central"
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
                    value={extraDestino}
                    onChange={(e) => setExtraDestino(e.target.value)}
                    placeholder="Ej: Campus Alameda - Lab 414 / Aulario Central"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Área TIC <span className="text-[#da291c]">*</span>
                  </label>
                  <select
                    value={extraArea}
                    onChange={(e) => setExtraArea(e.target.value as Area)}
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
                    Responsable Técnico Oficial <span className="text-[#da291c]">*</span>
                  </label>
                  <select
                    required
                    value={extraResponsible}
                    onChange={(e) => setExtraResponsible(e.target.value)}
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
                    Unidad Financiadora <span className="text-[#da291c]">*</span>
                  </label>
                  <select
                    required
                    value={extraUnidadFinanciadora}
                    onChange={(e) => setExtraUnidadFinanciadora(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-[#da291c]"
                  >
                    <option value="Dirección TIC Sede Talca">Dirección TIC Sede Talca</option>
                    <option value="Otra Unidad Externa (No TIC)">Otra Unidad Externa (No TIC)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Indica si este proyecto extrapresupuestario será financiado por remanentes de la Dirección TIC o por una unidad externa requirente.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Justificación de Urgencia <span className="text-[#da291c]">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={extraJustification}
                    onChange={(e) => setExtraJustification(e.target.value)}
                    placeholder="Detalle la contingencia operativa no prevista, impacto en la continuidad docente y justificación del requerimiento..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                  />
                </div>
              </div>

              {/* Dynamic Items Builder */}
              <div className="border-t border-[#d2d2d2] pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Desglose de Ítems e Inversiones Requeridas
                    </h4>
                    <p className="text-xs text-slate-500">
                      Complete las líneas solicitadas indicando descripción técnica, justificación del ítem, cantidad y precio unitario en CLP.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddExtraItemRow}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#da291c] hover:bg-[#b81e13] px-3.5 py-1.5 rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Ítem</span>
                  </button>
                </div>

                {/* Column Headers for Items */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-lg border border-[#d2d2d2] mb-2 tracking-wide">
                  <div className="col-span-4">Detalle / Descripción</div>
                  <div className="col-span-3">Justificación del Ítem</div>
                  <div className="col-span-1 text-center">Cant</div>
                  <div className="col-span-2 text-right">Precio Unitario</div>
                  <div className="col-span-2 text-right">Subtotal CLP</div>
                </div>

                {/* Rows List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {extraItems.map((item, index) => {
                    const q = parseInt(String(item.quantity).replace(/\D/g, ''), 10) || 0;
                    const p = parseInt(String(item.unitPriceCLP).replace(/\D/g, ''), 10) || 0;
                    const rowSubtotal = q * p;

                    return (
                      <div
                        key={index}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg sm:p-2 sm:border-0 sm:bg-transparent"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          {/* 1. Descripción */}
                          <div className="sm:col-span-4">
                            <label className="block text-xs font-bold text-slate-700 sm:hidden mb-1">
                              Descripción:
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: Banco de baterías selladas 12V 9Ah"
                              value={item.description}
                              onChange={(e) => handleExtraItemChange(index, 'description', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                            />
                          </div>

                          {/* 2. Justificación del Ítem */}
                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 sm:hidden mb-1">
                              Justificación:
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Reposición inmediata por fin de vida útil"
                              value={item.justification}
                              onChange={(e) => handleExtraItemChange(index, 'justification', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                            />
                          </div>

                          {/* 3. Cantidad */}
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-700 sm:hidden mb-1">
                              Cantidad:
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              required
                              placeholder="1"
                              value={item.quantity}
                              onChange={(e) => handleExtraItemChange(index, 'quantity', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-center font-bold text-slate-900 focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                            />
                          </div>

                          {/* 4. Precio Unitario */}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 sm:hidden mb-1">
                              Precio Unitario CLP:
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              required
                              placeholder="0"
                              value={item.unitPriceCLP}
                              onChange={(e) => handleExtraItemChange(index, 'unitPriceCLP', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded text-sm text-right font-mono font-bold text-slate-900 focus:border-[#da291c] focus:ring-1 focus:ring-[#da291c]"
                            />
                          </div>

                          {/* 5. Subtotal + Eliminar */}
                          <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t border-slate-200 sm:border-0">
                            <div className="text-right">
                              <span className="sm:hidden text-xs text-slate-500 mr-2">Subtotal:</span>
                              <span className="font-mono text-sm font-bold text-slate-900">
                                {formatCLP(rowSubtotal)}
                              </span>
                            </div>
                            {extraItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveExtraItemRow(index)}
                                className="text-slate-400 hover:text-[#da291c] p-1.5 rounded transition-colors cursor-pointer"
                                title="Eliminar ítem"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total Presupuesto Requerido Banner */}
                <div className="mt-4 p-4 bg-slate-100 rounded-lg border border-[#d2d2d2] flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Total Presupuesto Requerido (CLP):
                  </span>
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {formatCLP(calculateExtraItemsTotal())}
                  </span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#d2d2d2]">
                <button
                  type="button"
                  onClick={() => setIsExtraModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-[#da291c] hover:bg-[#b81e13] rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Guardar Proyecto No Presupuestado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Reporte de Auto-Asignación de PRES (Log Micro) */}
      {isAutoAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Cabecera oscura con borde rojo institucional */}
            <div className="bg-[#000000] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#da291c] shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-emerald-950/80 rounded-lg text-emerald-400 border border-emerald-500/30">
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">Reporte de Auto-Asignación de PRES</h3>
                  <p className="text-xs text-slate-400">
                    Auditoría de asignación automática de saldos APRE por ítem · {autoAssignReport.filter((r) => r.status === 'success').length} asignados con éxito, {autoAssignReport.filter((r) => r.status === 'failed').length} sin saldo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAutoAssignModalOpen(false);
                  setAutoAssignReport([]);
                }}
                className="text-slate-400 hover:text-white p-1 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Contenido / Tarjetas con scroll */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Total Ítems Evaluados</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{autoAssignReport.length}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-medium">Asignados con Éxito</span>
                  <p className="text-xl font-bold text-emerald-800 mt-0.5">
                    {autoAssignReport.filter((r) => r.status === 'success').length}
                  </p>
                </div>
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <span className="text-xs text-rose-700 font-medium">Sin Saldo Disponible</span>
                  <p className="text-xl font-bold text-rose-800 mt-0.5">
                    {autoAssignReport.filter((r) => r.status === 'failed').length}
                  </p>
                </div>
              </div>

              {/* Lista de tarjetas en lugar de tabla para evitar scroll horizontal */}
              <div className="max-h-[50vh] overflow-y-auto space-y-3 p-1">
                {autoAssignReport.map((report, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                      report.status === 'success' 
                        ? 'bg-emerald-50/50 border-emerald-200' 
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    {/* Fila Superior: Proyecto y Estado */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {report.project}
                        </span>
                        <p className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                          {report.item}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        report.status === 'success' 
                          ? 'bg-emerald-200 text-emerald-900' 
                          : 'bg-rose-200 text-rose-900'
                      }`}>
                        {report.status === 'success' ? '✓ Éxito' : '✕ Fallido'}
                      </span>
                    </div>

                    {/* Fila Inferior: Detalles */}
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 bg-white p-3.5 rounded-lg border border-slate-200 mt-2 shadow-sm">
                      {report.status === 'success' ? (
                        <>
                          <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
                            PRES:
                            <strong className="text-blue-900 font-mono text-base font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {report.pres}
                            </strong>
                          </span>
                          <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
                            Monto:
                            <strong className="text-emerald-800 text-base font-extrabold font-tabular">
                              {formatCLP(report.amount || 0)}
                            </strong>
                          </span>
                        </>
                      ) : (
                        <span className="text-rose-700 font-medium text-sm flex items-center gap-2">
                          <strong className="text-rose-900 font-bold">Motivo del fallo:</strong> 
                          {report.reason || 'Sin saldo disponible en la cuenta'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer con botón Cerrar que limpia estado */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAutoAssignModalOpen(false);
                  setAutoAssignReport([]);
                }}
                className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Stage4GimnasiaMonetaria as Stage4BolsaReadecuacion };
