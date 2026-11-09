import { ApreApprovedRecord, Project, Area, AreaTransfer, BudgetItem } from '../types/budget';
import { REAL_APRE_APPROVED_TALCA_2026 } from '../data/realApreApproved2026';
import { OFFICIAL_ACCOUNTS, getAccountByCode, suggestExclusion, formatCLP } from './formatters';

export const APRE_STORAGE_KEY_PREFIX = 'ua_talca_imported_apre_';
export const TRANSFERS_STORAGE_KEY_PREFIX = 'ua_talca_area_transfers_';

// 1. Get stored or default APRE records by year
export function getApreRecords(year: number = 2026): ApreApprovedRecord[] {
  try {
    const key = `${APRE_STORAGE_KEY_PREFIX}${year}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((r) => {
          const s = suggestExclusion(r);
          return {
            ...r,
            excluded: r.excluded === undefined ? s.excluded : Boolean(r.excluded),
            exclusionReason: r.exclusionReason || (r.excluded === undefined ? s.reason || undefined : undefined),
          };
        });
      }
    }
  } catch (e) {
    console.warn(`Error reading APRE records for ${year} from storage:`, e);
  }
  // If year 2026, return real APRE approved export
  if (year === 2026) {
    return REAL_APRE_APPROVED_TALCA_2026.map((r) => {
      const s = suggestExclusion(r);
      return {
        ...r,
        excluded: r.excluded === undefined ? s.excluded : Boolean(r.excluded),
        exclusionReason: r.exclusionReason || (r.excluded === undefined ? s.reason || undefined : undefined),
      };
    });
  }
  // For 2027 planning, return empty or user-imported 2027 records
  return [];
}

// 1.1. Get only active (non-excluded) APRE records by year
export function getActiveApreRecords(year: number = 2026): ApreApprovedRecord[] {
  return getApreRecords(year).filter((r) => !r.excluded);
}

// 2. Save APRE records by year
export function saveApreRecords(records: ApreApprovedRecord[], year: number = 2026): void {
  try {
    const key = `${APRE_STORAGE_KEY_PREFIX}${year}`;
    localStorage.setItem(key, JSON.stringify(records));
  } catch (e) {
    console.warn(`Error saving APRE records for ${year} to storage:`, e);
  }
}

// 3. Get area transfers by year
export function getAreaTransfers(year: number = 2026): AreaTransfer[] {
  try {
    const key = `${TRANSFERS_STORAGE_KEY_PREFIX}${year}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`Error reading area transfers for ${year} from storage:`, e);
  }
  return [];
}

// 4. Save area transfers by year
export function saveAreaTransfers(transfers: AreaTransfer[], year: number = 2026): void {
  try {
    const key = `${TRANSFERS_STORAGE_KEY_PREFIX}${year}`;
    localStorage.setItem(key, JSON.stringify(transfers));
  } catch (e) {
    console.warn(`Error saving area transfers for ${year} to storage:`, e);
  }
}

export interface AccountBalanceInfo {
  accountCode: string;
  accountName: string;
  categoryLabel: string;
  accountType: 'Activo' | 'Gasto';
  baseSaldoAPRE: number;
  netTransfers: number; // Positive if net received, negative if net sent
  consumedInPlay: number; // Amount consumed by authorized projects
  availableBalance: number;
}

export interface AreaAccountBalanceInfo {
  area: Area;
  accountCode: string;
  availableBalance: number;
  transfersIn: number;
  transfersOut: number;
}

// 5. Calculate balances by account code
export function calculateAccountBalances(
  apreRecords: ApreApprovedRecord[],
  transfers: AreaTransfer[],
  projects: Project[]
): Map<string, AccountBalanceInfo> {
  const map = new Map<string, AccountBalanceInfo>();

  const hasExcluded = apreRecords.some((r) => r.excluded);
  if (hasExcluded) {
    console.warn('[apreEngine] calculateAccountBalances recibió registros excluidos. El caller debe usar getActiveApreRecords.');
  }

  // Initialize with official accounts
  OFFICIAL_ACCOUNTS.forEach((acc) => {
    map.set(acc.code, {
      accountCode: acc.code,
      accountName: acc.name,
      categoryLabel: acc.categoryLabel || (acc.type === 'Activo' ? 'Inversión' : 'Operación'),
      accountType: acc.type,
      baseSaldoAPRE: 0,
      netTransfers: 0,
      consumedInPlay: 0,
      availableBalance: 0,
    });
  });

  // Sum initial saldo from APRE records (skip any excluded if received)
  apreRecords.forEach((record) => {
    if (record.excluded) return;
    const acc = map.get(record.codigoCuenta);
    if (acc) {
      acc.baseSaldoAPRE += record.saldo;
    } else {
      // Add if record has account code not in pre-list
      map.set(record.codigoCuenta, {
        accountCode: record.codigoCuenta,
        accountName: record.cuentaContable || record.codigoCuenta,
        categoryLabel: record.tipoCuenta === 'ACTIVOS' ? 'Inversión' : 'Operación',
        accountType: record.tipoCuenta === 'ACTIVOS' ? 'Activo' : 'Gasto',
        baseSaldoAPRE: record.saldo,
        netTransfers: 0,
        consumedInPlay: 0,
        availableBalance: record.saldo,
      });
    }
  });

  // Calculate consumed in authorized projects (executionStatus !== 'No Iniciado' and !== 'Pausado')
  // Avoid double-counting: if proj.reportedToApre is true, APRE's record.saldo already reflects it
  projects.forEach((proj) => {
    const isExternal = proj.unidadFinanciadora && !proj.unidadFinanciadora.includes('Dirección TIC');
    const isStarted =
      proj.executionStatus !== 'No Iniciado' &&
      proj.executionStatus !== 'Pausado' &&
      !proj.reportedToApre &&
      !isExternal;
    if (isStarted) {
      proj.items.forEach((it) => {
        if (it.accountCode && map.has(it.accountCode)) {
          const acc = map.get(it.accountCode)!;
          acc.consumedInPlay += it.totalPriceCLP;
        }
      });
    }
  });

  // Calculate final available balance
  map.forEach((acc) => {
    acc.availableBalance = Math.max(0, acc.baseSaldoAPRE - acc.consumedInPlay);
  });

  return map;
}

// Detailed item evaluation
export interface ItemFinancingEvaluation {
  item: BudgetItem;
  accountCode: string;
  accountName: string;
  itemCost: number;
  availableAccountBalance: number;
  isCovered: boolean;
  gapCLP: number; // Deficit amount if not covered
  presCodigo?: string;
  presDetail?: string;
  presAvailableSaldo?: number;
  presAssignedCLP?: number;
  hasPresAssigned?: boolean;
}

export interface ProjectFinancingEvaluation {
  project: Project;
  isFinanced: boolean; // 🟢 FINANCIADO if true, 🔴 SIN FINANCIAMIENTO if false
  totalProjectCost: number;
  itemsEvaluation: ItemFinancingEvaluation[];
  totalGapCLP: number;
  bottlenecks: Array<{
    accountCode: string;
    accountName: string;
    requiredCLP: number;
    availableCLP: number;
    deficitCLP: number;
    presCodigo?: string;
    reason?: string;
    itemId?: string;
  }>;
}

// 6. Evaluate project financing against APRE at the ITEM level (PRES-per-item model)
export function evaluateProjectFinancing(
  project: Project,
  accountBalances?: Map<string, AccountBalanceInfo>,
  apreRecordsParam?: ApreApprovedRecord[],
  allProjectsParam?: Project[],
  fiscalYear: number = 2026
): ProjectFinancingEvaluation {
  // Proyectos financiados por unidades externas no requieren saldos APRE de la Dirección TIC
  if (project.unidadFinanciadora && !project.unidadFinanciadora.includes('Dirección TIC')) {
    const itemsEvaluation: ItemFinancingEvaluation[] = (project.items || []).map((it) => ({
      item: it,
      accountCode: it.accountCode || 'EXTERNO',
      accountName: `Financiamiento Externo (${project.unidadFinanciadora})`,
      itemCost: it.totalPriceCLP,
      availableAccountBalance: it.totalPriceCLP,
      isCovered: true,
      gapCLP: 0,
      presCodigo: undefined,
      presDetail: `Fondos de ${project.unidadFinanciadora}`,
      presAvailableSaldo: it.totalPriceCLP,
      presAssignedCLP: it.totalPriceCLP,
      hasPresAssigned: true,
    }));

    return {
      project,
      isFinanced: true,
      totalProjectCost: project.requestedBudgetCLP,
      itemsEvaluation,
      totalGapCLP: 0,
      bottlenecks: [],
    };
  }

  // Get active (non-excluded) APRE records
  const activeRecords = apreRecordsParam && apreRecordsParam.length > 0
    ? apreRecordsParam.filter((r) => !r.excluded)
    : getActiveApreRecords(project.fiscalYear || fiscalYear);

  // Map PRES code -> ApreApprovedRecord
  const presMap = new Map<string, ApreApprovedRecord>();
  activeRecords.forEach((r) => {
    presMap.set(r.codigoPres, r);
  });

  // Calculate confirmed allocations from other started/running projects
  const otherConfirmedAllocations = new Map<string, number>();
  if (allProjectsParam && allProjectsParam.length > 0) {
    allProjectsParam.forEach((otherProj) => {
      if (
        otherProj.id !== project.id &&
        otherProj.executionStatus !== 'No Iniciado' &&
        otherProj.executionStatus !== 'Pausado' &&
        !otherProj.reportedToApre
      ) {
        otherProj.items.forEach((it) => {
          if (it.aprePresCodigo) {
            const amount = it.apreApprovedCLP || it.totalPriceCLP;
            otherConfirmedAllocations.set(
              it.aprePresCodigo,
              (otherConfirmedAllocations.get(it.aprePresCodigo) || 0) + amount
            );
          }
        });
      }
    });
  }

  // Calculate total project demand per PRES code
  const presDemands = new Map<string, number>();
  project.items.forEach((it) => {
    if (it.aprePresCodigo && it.apreApprovedCLP && it.apreApprovedCLP > 0) {
      presDemands.set(
        it.aprePresCodigo,
        (presDemands.get(it.aprePresCodigo) || 0) + it.apreApprovedCLP
      );
    }
  });

  const itemsEvaluation: ItemFinancingEvaluation[] = [];
  const bottlenecks: Array<{
    accountCode: string;
    accountName: string;
    requiredCLP: number;
    availableCLP: number;
    deficitCLP: number;
    presCodigo?: string;
    reason?: string;
    itemId?: string;
  }> = [];

  const presBottleneckAdded = new Set<string>();

  // 1. Evaluate each item
  project.items.forEach((it) => {
    const hasPres = Boolean(it.aprePresCodigo && it.apreApprovedCLP && it.apreApprovedCLP > 0);
    const presRecord = hasPres && it.aprePresCodigo ? presMap.get(it.aprePresCodigo) : undefined;
    const isPresValid = Boolean(presRecord && !presRecord.excluded);

    const presConfirmedOther = (hasPres && it.aprePresCodigo) ? (otherConfirmedAllocations.get(it.aprePresCodigo) || 0) : 0;
    const presAvailableSaldo = presRecord ? Math.max(0, presRecord.saldo - presConfirmedOther) : 0;
    const totalDemandedForThisPres = (hasPres && it.aprePresCodigo) ? (presDemands.get(it.aprePresCodigo) || 0) : 0;

    const isPresSufficient = isPresValid && totalDemandedForThisPres <= presAvailableSaldo;
    const isItemCovered = hasPres && isPresValid && isPresSufficient;

    let itemGap = 0;
    if (!isItemCovered) {
      if (!hasPres || !isPresValid) {
        itemGap = it.totalPriceCLP;
      } else {
        const presDeficit = Math.max(0, totalDemandedForThisPres - presAvailableSaldo);
        itemGap = Math.min(it.totalPriceCLP, presDeficit);
      }
    }

    const accCode = it.accountCode || presRecord?.codigoCuenta || '1203102';
    const accName = getAccountByCode(accCode)?.name || presRecord?.cuentaContable || (accountBalances?.get(accCode)?.accountName) || accCode;
    const availableAccountBalance = presRecord ? presAvailableSaldo : (accountBalances?.get(accCode)?.availableBalance || 0);

    itemsEvaluation.push({
      item: it,
      accountCode: accCode,
      accountName: accName,
      itemCost: it.totalPriceCLP,
      availableAccountBalance,
      isCovered: isItemCovered,
      gapCLP: itemGap,
      presCodigo: it.aprePresCodigo,
      presDetail: presRecord?.detalle,
      presAvailableSaldo,
      presAssignedCLP: it.apreApprovedCLP,
      hasPresAssigned: hasPres,
    });

    // If item has no PRES assigned, report as bottleneck
    if (!hasPres) {
      bottlenecks.push({
        accountCode: accCode,
        accountName: `${accName} · "${it.description}"`,
        requiredCLP: it.totalPriceCLP,
        availableCLP: 0,
        deficitCLP: it.totalPriceCLP,
        presCodigo: undefined,
        reason: 'Ítem sin PRES asignado',
        itemId: it.id,
      });
    } else if (!isPresValid) {
      if (!presBottleneckAdded.has(it.aprePresCodigo!)) {
        presBottleneckAdded.add(it.aprePresCodigo!);
        bottlenecks.push({
          accountCode: accCode,
          accountName: `PRES ${it.aprePresCodigo} (Inexistente o Excluido)`,
          requiredCLP: totalDemandedForThisPres,
          availableCLP: 0,
          deficitCLP: totalDemandedForThisPres,
          presCodigo: it.aprePresCodigo,
          reason: 'PRES inexistente o excluido',
        });
      }
    }
  });

  // 2. Evaluate PRES balance limits
  presDemands.forEach((demanded, presCode) => {
    const rec = presMap.get(presCode);
    if (rec && !rec.excluded) {
      const confirmedOther = otherConfirmedAllocations.get(presCode) || 0;
      const avail = Math.max(0, rec.saldo - confirmedOther);
      if (demanded > avail) {
        if (!presBottleneckAdded.has(presCode)) {
          presBottleneckAdded.add(presCode);
          const deficit = demanded - avail;
          bottlenecks.push({
            accountCode: rec.codigoCuenta,
            accountName: `${rec.cuentaContable} (PRES ${presCode}: ${rec.detalle})`,
            requiredCLP: demanded,
            availableCLP: avail,
            deficitCLP: deficit,
            presCodigo: presCode,
            reason: `Saldo PRES insuficiente (Déficit: ${formatCLP(deficit)})`,
          });
        }
      }
    }
  });

  const isFinanced = project.items.length > 0 && bottlenecks.length === 0;

  let totalGapCLP = 0;
  bottlenecks.forEach((b) => {
    totalGapCLP += b.deficitCLP;
  });

  return {
    project,
    isFinanced,
    totalProjectCost: project.requestedBudgetCLP,
    itemsEvaluation,
    totalGapCLP,
    bottlenecks,
  };
}

// 7. Deduct from APRE when "PLAY" is authorized
export function authorizeProjectPlay(
  project: Project,
  recordsOrYear: ApreApprovedRecord[] | number = 2026,
  yearParam: number = 2026
): { success: boolean; updatedRecords: ApreApprovedRecord[]; updatedProject: Project; message: string } {
  const year = typeof recordsOrYear === 'number' ? recordsOrYear : yearParam;
  // If array passed, clone it; otherwise read all records (including excluded) from storage
  const allRecords: ApreApprovedRecord[] = Array.isArray(recordsOrYear)
    ? recordsOrYear.map((r) => ({ ...r }))
    : getApreRecords(year).map((r) => ({ ...r }));

  // Proyectos con financiamiento externo no descuentan fondos de APRE Dirección TIC
  if (project.unidadFinanciadora && !project.unidadFinanciadora.includes('Dirección TIC')) {
    const updatedProject: Project = {
      ...project,
      executionStatus: 'En Plazo',
      progressPercentage: Math.max(5, project.progressPercentage),
      directorNotes: `${project.directorNotes ? project.directorNotes + ' · ' : ''}[PLAY] Autorizado con fondos externos de: ${project.unidadFinanciadora} (${new Date().toLocaleDateString('es-CL')}). Sin descuento APRE.`,
    };
    return {
      success: true,
      updatedRecords: allRecords,
      updatedProject,
      message: `Proyecto ${project.code} autorizado con financiamiento externo de ${project.unidadFinanciadora}. Sin cargo a APRE Dirección TIC.`,
    };
  }

  const excludedNotes: string[] = [];

  project.items.forEach((item) => {
    const code = item.accountCode || '1203102';
    let remainingToDeduct = item.totalPriceCLP;

    // Check if item references an excluded PRES code
    const itemPresCode = item.aprePresCodigo || (item as any).codigoPres;
    if (itemPresCode) {
      const isPresExcluded = allRecords.some(
        (r) => r.excluded && r.codigoPres.toLowerCase() === itemPresCode.toLowerCase()
      );
      if (isPresExcluded) {
        excludedNotes.push(`⚠️ PRES ${itemPresCode} excluido — no se descontó.`);
        return; // skip deduction for this item
      }
    }

    // If item has aprePresCodigo assigned, deduct from that specific PRES record first
    if (item.aprePresCodigo) {
      const targetRecord = allRecords.find(
        (r) => !r.excluded && r.codigoPres.toLowerCase() === item.aprePresCodigo!.toLowerCase() && r.saldo > 0
      );
      if (targetRecord) {
        const deductTarget = Math.min(targetRecord.saldo, item.apreApprovedCLP || remainingToDeduct);
        targetRecord.saldo = Math.max(0, targetRecord.saldo - deductTarget);
        targetRecord.montoEjecutado = targetRecord.montoEjecutado + deductTarget;
        remainingToDeduct -= deductTarget;
        if (remainingToDeduct <= 0) return;
      }
    }

    // Fallback: Find non-excluded APRE records matching this account code with saldo > 0
    if (remainingToDeduct > 0) {
      for (let i = 0; i < allRecords.length; i++) {
        if (!allRecords[i].excluded && allRecords[i].codigoCuenta === code && allRecords[i].saldo > 0) {
          const deductAmount = Math.min(allRecords[i].saldo, remainingToDeduct);
          allRecords[i] = {
            ...allRecords[i],
            saldo: Math.max(0, allRecords[i].saldo - deductAmount),
            montoEjecutado: allRecords[i].montoEjecutado + deductAmount,
          };
          remainingToDeduct -= deductAmount;
          if (remainingToDeduct <= 0) break;
        }
      }
    }
  });

  const notesParts: string[] = [];
  if (project.directorNotes) {
    notesParts.push(project.directorNotes);
  }
  notesParts.push(`[PLAY] Autorizado e iniciado en Bolsa Presupuestaria (${new Date().toLocaleDateString('es-CL')}).`);
  if (excludedNotes.length > 0) {
    notesParts.push(Array.from(new Set(excludedNotes)).join(' '));
  }

  const updatedProject: Project = {
    ...project,
    executionStatus: 'En Plazo',
    progressPercentage: Math.max(project.progressPercentage, 5),
    directorNotes: notesParts.join(' · '),
  };

  saveApreRecords(allRecords, year);

  return {
    success: true,
    updatedRecords: allRecords,
    updatedProject,
    message: `Proyecto ${project.code} autorizado e iniciado exitosamente.`,
  };
}
