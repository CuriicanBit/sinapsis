import { ApreApprovedRecord, Project, Area, AreaTransfer, BudgetItem } from '../types/budget';
import { REAL_APRE_APPROVED_TALCA_2026 } from '../data/realApreApproved2026';
import { OFFICIAL_ACCOUNTS, getAccountByCode } from './formatters';

export const APRE_STORAGE_KEY = 'ua_talca_imported_apre_2026';
export const TRANSFERS_STORAGE_KEY = 'ua_talca_area_transfers_2026';

// 1. Get stored or default APRE records
export function getApreRecords(): ApreApprovedRecord[] {
  try {
    const saved = localStorage.getItem(APRE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading APRE records from storage:', e);
  }
  return REAL_APRE_APPROVED_TALCA_2026;
}

// 2. Save APRE records
export function saveApreRecords(records: ApreApprovedRecord[]): void {
  try {
    localStorage.setItem(APRE_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Error saving APRE records to storage:', e);
  }
}

// 3. Get area transfers
export function getAreaTransfers(): AreaTransfer[] {
  try {
    const saved = localStorage.getItem(TRANSFERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading area transfers from storage:', e);
  }
  return [];
}

// 4. Save area transfers
export function saveAreaTransfers(transfers: AreaTransfer[]): void {
  try {
    localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(transfers));
  } catch (e) {
    console.warn('Error saving area transfers to storage:', e);
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

  // Sum initial saldo from APRE records
  apreRecords.forEach((record) => {
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
  // Note: projects that are already running or completed have their items committed
  projects.forEach((proj) => {
    const isStarted = proj.executionStatus !== 'No Iniciado' && proj.executionStatus !== 'Pausado';
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
  }>;
}

// 6. Evaluate project financing against current APRE account balances
export function evaluateProjectFinancing(
  project: Project,
  accountBalances: Map<string, AccountBalanceInfo>
): ProjectFinancingEvaluation {
  let isFinanced = true;
  let totalGapCLP = 0;
  const itemsEvaluation: ItemFinancingEvaluation[] = [];

  // Group items by account code to ensure cumulative check within the project
  const accountDemands = new Map<string, number>();
  project.items.forEach((it) => {
    const code = it.accountCode || '1203102'; // default fallback
    accountDemands.set(code, (accountDemands.get(code) || 0) + it.totalPriceCLP);
  });

  const bottlenecksMap = new Map<string, {
    accountCode: string;
    accountName: string;
    requiredCLP: number;
    availableCLP: number;
    deficitCLP: number;
  }>();

  project.items.forEach((it) => {
    const code = it.accountCode || '1203102';
    const accInfo = accountBalances.get(code);
    const available = accInfo ? accInfo.availableBalance : 0;
    const totalDemandedForAccount = accountDemands.get(code) || it.totalPriceCLP;
    const accDeficit = Math.max(0, totalDemandedForAccount - available);

    const isCovered = accDeficit === 0;
    const itemGap = !isCovered ? Math.min(it.totalPriceCLP, accDeficit) : 0;

    if (!isCovered) {
      isFinanced = false;
      if (!bottlenecksMap.has(code)) {
        bottlenecksMap.set(code, {
          accountCode: code,
          accountName: accInfo?.accountName || getAccountByCode(code)?.name || code,
          requiredCLP: totalDemandedForAccount,
          availableCLP: available,
          deficitCLP: accDeficit,
        });
      }
    }

    itemsEvaluation.push({
      item: it,
      accountCode: code,
      accountName: accInfo?.accountName || getAccountByCode(code)?.name || code,
      itemCost: it.totalPriceCLP,
      availableAccountBalance: available,
      isCovered,
      gapCLP: itemGap,
    });
  });

  bottlenecksMap.forEach((b) => {
    totalGapCLP += b.deficitCLP;
  });

  return {
    project,
    isFinanced,
    totalProjectCost: project.requestedBudgetCLP,
    itemsEvaluation,
    totalGapCLP,
    bottlenecks: Array.from(bottlenecksMap.values()),
  };
}

// 7. Deduct from APRE when "PLAY" is authorized
export function authorizeProjectPlay(
  project: Project,
  apreRecords: ApreApprovedRecord[]
): { updatedRecords: ApreApprovedRecord[]; updatedProject: Project } {
  const updatedRecords = [...apreRecords];

  project.items.forEach((item) => {
    const code = item.accountCode || '1203102';
    let remainingToDeduct = item.totalPriceCLP;

    // Find APRE records matching this account code
    for (let i = 0; i < updatedRecords.length; i++) {
      if (updatedRecords[i].codigoCuenta === code && updatedRecords[i].saldo > 0) {
        const deductAmount = Math.min(updatedRecords[i].saldo, remainingToDeduct);
        updatedRecords[i] = {
          ...updatedRecords[i],
          saldo: Math.max(0, updatedRecords[i].saldo - deductAmount),
          montoEjecutado: updatedRecords[i].montoEjecutado + deductAmount,
        };
        remainingToDeduct -= deductAmount;
        if (remainingToDeduct <= 0) break;
      }
    }
  });

  const updatedProject: Project = {
    ...project,
    executionStatus: 'En Plazo',
    progressPercentage: Math.max(project.progressPercentage, 5),
    directorNotes: (project.directorNotes ? project.directorNotes + ' · ' : '') +
      `[PLAY] Autorizado e iniciado en Bolsa Presupuestaria (${new Date().toLocaleDateString('es-CL')}).`,
  };

  saveApreRecords(updatedRecords);

  return {
    updatedRecords,
    updatedProject,
  };
}
