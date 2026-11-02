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

export const OFFICIAL_AREAS: Area[] = [
  'Usuarios',
  'Laboratorios',
  'Salas de Clases',
  'Redes',
  'Salones de Eventos',
  'Salas Especiales',
  'CCTV',
];

export const OFFICIAL_TECHNICIANS = [
  'Cristian',
  'Claudio',
  'Juan',
  'Ignacio',
  'Roberto',
  'Marianela',
  'Esteban',
];

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
  apreCodigoPres?: string;
  apreAprobadoCLP?: number;
  apreSaldoCLP?: number;
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
