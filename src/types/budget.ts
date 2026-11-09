export type Role = 'tecnico' | 'coordinador' | 'director';

export type StageId = 
  | 'formulacion' 
  | 'contable' 
  | 'apre' 
  | 'readecuacion'
  | 'gimnasia' 
  | 'ejecucion' 
  | 'gerencial';

export type Area = 
  | 'Usuarios' 
  | 'Laboratorios' 
  | 'Salas de Clases' 
  | 'Redes' 
  | 'Salones de Eventos' 
  | 'Salas Especiales' 
  | 'CCTV';

export let OFFICIAL_AREAS: Area[] = [
  'Usuarios',
  'Laboratorios',
  'Salas de Clases',
  'Redes',
  'Salones de Eventos',
  'Salas Especiales',
  'CCTV',
];

export let OFFICIAL_TECHNICIANS: string[] = [
  'Cristian',
  'Claudio',
  'Juan',
  'Ignacio',
  'Roberto',
  'Marianela',
  'Esteban',
];

export function updateOfficialAreas(data: any[]) {
  OFFICIAL_AREAS = data.map((a) => (typeof a === 'string' ? a : a.name));
}

export function updateOfficialTechnicians(data: any[]) {
  OFFICIAL_TECHNICIANS = data.map((t) => (typeof t === 'string' ? t : t.name));
}

export type AccountType = 'Activo' | 'Gasto'; // Activo = Inversión/CAPEX, Gasto = Operación/OPEX

export interface AccountingAccount {
  code: string;
  name: string;
  type: AccountType;
  categoryLabel?: string; // Inversión, Operación, Gastos, Gastos en Personal
  description: string;
}

export interface BudgetItem {
  id: string;
  description: string;
  justification?: string;
  quantity: number;
  unitPriceCLP: number;
  totalPriceCLP: number;
  accountCode?: string;
  aprePresCodigo?: string;
  apreApprovedCLP?: number;
  montoCotizadoCLP?: number;
  montoEjecutadoFinalCLP?: number;
}

export type ReviewStatus = 'Borrador' | 'En Revisión' | 'Aprobado' | 'Ajuste Solicitado';

export type ExecutionStatus = 'No Iniciado' | 'En Plazo' | 'Completado' | 'En Riesgo' | 'Atrasado' | 'Pausado';

export interface BitacoraEntry {
  id: string;
  date: string;
  reason: string;
  correctiveAction: string;
  expectedResolutionDate: string;
  author: string;
  role: Role;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  completed: boolean;
}

export type HitoProyecto = ProjectMilestone;

export interface Project {
  id: string;
  code: string;
  title: string;
  area: Area;
  responsible: string;
  estimatedStartMonth: number; // 1 = Enero, 12 = Diciembre
  justification: string;
  reviewStatus: ReviewStatus;
  directorNotes?: string;
  items: BudgetItem[];
  requestedBudgetCLP: number;
  approvedCeilingCLP?: number;
  executedBudgetCLP: number;
  progressPercentage: number;
  executionStatus: ExecutionStatus;
  isExtrapresupuestario: boolean;
  bitacora: BitacoraEntry[];
  pausedInPostCut?: boolean;
  fiscalYear?: number; // 2026 (Ejecución activa), 2027 (Planificación), 2025 (Histórico)
  reportedToApre?: boolean; // True si ya fue reportado/cargado en APRE (evita doble conteo de ejecución)
  // Flujo de Abastecimiento y Pago (Marianela)
  especificacionesTecnicas?: string;
  proveedorAdjudicado?: string;
  recepcionOk?: boolean;
  enviadoAPago?: boolean;
  destino?: string;
  unidadFinanciadora?: string;
  milestones?: ProjectMilestone[];
}

export interface ApreApprovedRecord {
  distribucion: string;
  codigoPres: string;
  ano: number;
  sucursal: string;
  codigoTipoCuenta: string;
  tipoCuenta: string;
  codigoCentro: string;
  centroCosto: string;
  codigoGrupoCuenta: string;
  grupoCuenta: string;
  codigoCuenta: string;
  cuentaContable: string;
  codigoItem: string;
  itemCosto: string;
  detalle: string;
  justificacion: string;
  cantidadDesc: string;
  montoTotal: number;
  montoEjecutado: number;
  saldo: number;
  divisa: string;
  ctaCorriente: string;
  usuarioCre?: string;
  excluded?: boolean;         // default false si no existe
  exclusionReason?: string;   // Motivo cuando excluded === true
}

export interface BudgetCutSimulation {
  totalRequested: number;
  juntaApprovedCeiling: number;
  cutPercentage: number;
  isApplied: boolean;
}

export interface AreaTransfer {
  id: string;
  date: string;
  accountCode: string;
  sourceArea: Area;
  targetArea: Area;
  amountCLP: number;
  reason: string;
  author: string;
}
