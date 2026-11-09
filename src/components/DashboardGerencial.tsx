import React, { useMemo, useState } from 'react';
import { evaluateProjectFinancing, calculateAccountBalances, getActiveApreRecords, getAreaTransfers } from '../utils/apreEngine';
import { Project, Role, StageId } from '../types/budget';
import { formatCLP, getAccountByCode } from '../utils/formatters';
import { useCatalog } from '../CatalogContext';
import { 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  PieChart, 
  Building2, 
  Layers, 
  ArrowUpRight, 
  Clock, 
  Sparkles,
  GitBranch,
  X
} from 'lucide-react';

interface DashboardGerencialProps {
  projects: Project[];
  currentRole: Role;
  onNavigateToStage: (stage: StageId) => void;
  currentFiscalYear?: number;
}

export const DashboardGerencial: React.FC<DashboardGerencialProps> = ({
  projects,
  currentRole,
  onNavigateToStage,
  currentFiscalYear = 2026,
}) => {
  const { areas, cuentas } = useCatalog();

  const apreRecords = getActiveApreRecords(currentFiscalYear);
  const transfers = getAreaTransfers(currentFiscalYear);
  const accountBalances = calculateAccountBalances(apreRecords, transfers, projects);

  const totalSolicitado = projects.reduce((sum, p) => sum + p.requestedBudgetCLP, 0);
  const totalAprobado = projects.reduce((sum, p) => sum + (p.approvedCeilingCLP ?? p.requestedBudgetCLP), 0);
  const totalEjecutado = projects.reduce((sum, p) => sum + p.executedBudgetCLP, 0);
  const totalDisponible = Math.max(0, totalAprobado - totalEjecutado);
  const executionRate = totalAprobado > 0 ? Math.round((totalEjecutado / totalAprobado) * 100) : 0;

  const atrasados = projects.filter((p) => p.executionStatus === 'Atrasado');
  const enRiesgo = projects.filter((p) => p.executionStatus === 'En Riesgo');
  const completados = projects.filter((p) => p.executionStatus === 'Completado');
  const extrapresupuestarios = projects.filter((p) => p.isExtrapresupuestario);

  const areasList = areas.map((a) => a.name);
  const areaData = areasList.map((area) => {
    const areaProjects = projects.filter((p) => p.area === area);
    const budget = areaProjects.reduce((sum, p) => sum + (p.approvedCeilingCLP ?? p.requestedBudgetCLP), 0);
    const executed = areaProjects.reduce((sum, p) => sum + p.executedBudgetCLP, 0);
    const percentOfTotal = totalAprobado > 0 ? Math.round((budget / totalAprobado) * 100) : 0;
    const executionPercent = budget > 0 ? Math.round((executed / budget) * 100) : 0;
    return {
      area,
      budget,
      executed,
      percentOfTotal,
      executionPercent,
      projectCount: areaProjects.length,
    };
  }).filter((a) => a.budget > 0);

  const allItems = projects.flatMap((p) =>
    p.items.map((it) => ({
      ...it,
      project: p,
      account: getAccountByCode(it.accountCode),
    }))
  );

  let capexTotal = 0;
  let opexTotal = 0;
  allItems.forEach((it) => {
    if (it.account?.type === 'Activo') capexTotal += it.totalPriceCLP;
    if (it.account?.type === 'Gasto') opexTotal += it.totalPriceCLP;
  });

  const capexPercent = (capexTotal + opexTotal) > 0 ? Math.round((capexTotal / (capexTotal + opexTotal)) * 100) : 0;
  const opexPercent = 100 - capexPercent;

  const accountsData = cuentas.map((acc) => {
    const accItems = allItems.filter((it) => it.accountCode === acc.code);
    const budget = accItems.reduce((sum, it) => sum + it.totalPriceCLP, 0);
    const executed = accItems.reduce((sum, it) => {
      const p = it.project;
      const progress = p.progressPercentage / 100;
      return sum + Math.round(it.totalPriceCLP * progress);
    }, 0);
    const executionPercent = budget > 0 ? Math.round((executed / budget) * 100) : 0;
    return {
      ...acc,
      budget,
      executed,
      executionPercent,
      itemsCount: accItems.length,
    };
  }).filter((a) => a.budget > 0);

  const subexecutionRiskAccounts = accountsData.filter((a) => a.budget > 5000000 && a.executionPercent < 30);

  return (
    <div className="w-full space-y-6">
      {/* Executive Welcome & Context Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Visión de Consecuencia Estratégica</span>
              <span>·</span>
              <span>Sede Talca</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Tablero de Control Gerencial TIC {currentFiscalYear}
            </h2>
            <p className="text-base text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Consolidación automática derivada del flujo técnico y contable. Muestra el estado integral del presupuesto solicitado, techos aprobados en APRE, ejecución física y alertas tempranas de desviación.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateToStage('apre')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
            >
              <span>Ver Detalle APRE</span>
              <ArrowUpRight className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={() => onNavigateToStage('readecuacion')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span>Bolsa y Readecuación</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 font-medium uppercase block">Presupuesto Solicitado</span>
            <span className="text-2xl font-bold text-white font-tabular mt-1 block">
              {formatCLP(totalSolicitado)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              Formulado originalmente
            </span>
          </div>

          <div className="p-4 bg-blue-950/70 rounded-lg border border-blue-800/80">
            <span className="text-xs text-blue-300 font-semibold uppercase block">Aprobado Vigente APRE</span>
            <span className="text-2xl font-bold text-blue-200 font-tabular mt-1 block">
              {formatCLP(totalAprobado)}
            </span>
            <span className="text-xs text-blue-300/80 mt-1 block">
              Techo activo post-Junta
            </span>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-medium uppercase block">Total Ejecutado</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-tabular">
                {executionRate}%
              </span>
            </div>
            <span className="text-2xl font-bold text-emerald-400 font-tabular mt-1 block">
              {formatCLP(totalEjecutado)}
            </span>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, executionRate)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700">
            <span className="text-xs text-amber-300 font-medium uppercase block">Saldo Disponible</span>
            <span className="text-2xl font-bold text-amber-300 font-tabular mt-1 block">
              {formatCLP(totalDisponible)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              Remanente por comprometer
            </span>
          </div>
        </div>
      </div>

      {/* Smart Alerts Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-5 rounded-xl border ${
          atrasados.length > 0 
            ? 'bg-rose-50 border-rose-200 text-rose-950' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-start gap-3">
            {atrasados.length > 0 ? (
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold">
                  {atrasados.length > 0
                    ? `Alerta Crítica: ${atrasados.length} Proyectos Atrasados`
                    : 'Sin Proyectos Atrasados'}
                </h4>
                {atrasados.length > 0 && (
                  <button
                    onClick={() => onNavigateToStage('ejecucion')}
                    className="text-xs font-bold text-rose-800 hover:underline"
                  >
                    Ver Bitácoras →
                  </button>
                )}
              </div>

              {atrasados.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {atrasados.map((p) => (
                    <div key={p.id} className="p-2.5 bg-white/80 rounded border border-rose-200 text-xs">
                      <p className="font-bold text-rose-900">{p.code} · {p.title}</p>
                      {p.bitacora[0] && (
                        <p className="text-slate-700 mt-1">
                          <strong>Causa:</strong> {p.bitacora[0].reason}
                        </p>
                      )}
                      <p className="text-slate-500 mt-0.5 font-medium">
                        Resp: {p.responsible} · Solución est: {p.bitacora[0]?.expectedResolutionDate || 'Inmediata'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-emerald-800 mt-1">
                  Todos los proyectos TIC se encuentran en plazo regular o completados conforme al cronograma 2026.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-xl border ${
          subexecutionRiskAccounts.length > 0 
            ? 'bg-amber-50 border-amber-200 text-amber-950' 
            : 'bg-blue-50 border-blue-200 text-blue-950'
        }`}>
          <div className="flex items-start gap-3">
            {subexecutionRiskAccounts.length > 0 ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <TrendingUp className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold">
                  {subexecutionRiskAccounts.length > 0
                    ? `Riesgo de Subejecución en ${subexecutionRiskAccounts.length} Cuentas`
                    : 'Ritmo de Ejecución Óptimo'}
                </h4>
                <button
                  onClick={() => onNavigateToStage('contable')}
                  className="text-xs font-bold text-blue-800 hover:underline"
                >
                  Ver Cuentas →
                </button>
              </div>

              {subexecutionRiskAccounts.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {subexecutionRiskAccounts.map((acc) => (
                    <div key={acc.code} className="p-2.5 bg-white/80 rounded border border-amber-200 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-amber-950">{acc.code} · {acc.name}</p>
                        <p className="text-slate-600">Presupuestado: {formatCLP(acc.budget)}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-800 block">{acc.executionPercent}% ejecutado</span>
                        <span className="text-[10px] text-slate-500">Avance bajo</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-800 mt-1">
                  El ritmo de gasto y compromisos contables avanza alineado a las metas institucionales de la Universidad.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Visual Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-700" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Distribución y Ejecución por Área TIC
                </h3>
                <p className="text-xs text-slate-500">
                  Presupuesto vigente asignado vs monto ejecutado a la fecha (CLP)
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {areaData.length} áreas activas
            </span>
          </div>

          <div className="space-y-4">
            {areaData.map((a) => (
              <div key={a.area} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{a.area}</span>
                    <span className="text-xs text-slate-500">
                      ({a.projectCount} {a.projectCount === 1 ? 'proyecto' : 'proyectos'})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-tabular">
                    <span className="text-slate-500">
                      Ejec: <strong className="text-slate-900">{formatCLP(a.executed)}</strong>
                    </span>
                    <span className="font-bold text-blue-900">
                      Total: {formatCLP(a.budget)}
                    </span>
                    <span className="w-12 text-right font-semibold text-slate-700">
                      {a.executionPercent}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden relative">
                  <div
                    className="h-3 rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, (a.budget / totalAprobado) * 100 * 2.5)}%` }}
                  />
                  <div
                    className="h-3 rounded-full bg-emerald-500 absolute top-0 left-0 opacity-80"
                    style={{
                      width: `${Math.min(
                        100,
                        (a.budget / totalAprobado) * 100 * 2.5 * (a.executionPercent / 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                Presupuesto Asignado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                Monto Facturado Real
              </span>
            </div>
            <span className="font-medium">Universidad Autónoma de Chile · Sede Talca</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <PieChart className="w-5 h-5 text-indigo-700" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Composición Contable
                </h3>
                <p className="text-xs text-slate-500">CAPEX Inversión vs OPEX Operación</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100">
                <div
                  className="bg-blue-600 transition-all"
                  style={{ width: `${capexPercent}%` }}
                />
                <div
                  className="bg-emerald-600 transition-all"
                  style={{ width: `${opexPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900">CAPEX</span>
                    <span className="text-xs font-bold font-tabular text-blue-800">{capexPercent}%</span>
                  </div>
                  <p className="text-base font-bold text-blue-950 font-tabular mt-1">
                    {formatCLP(capexTotal)}
                  </p>
                  <p className="text-[11px] text-blue-700 mt-0.5">Activos fijos (Equipos, Redes)</p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">OPEX</span>
                    <span className="text-xs font-bold font-tabular text-emerald-800">{opexPercent}%</span>
                  </div>
                  <p className="text-base font-bold text-emerald-950 font-tabular mt-1">
                    {formatCLP(opexTotal)}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">Gasto y servicios continuos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
              Estado de la Cartera de Proyectos
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-700 font-medium">Total de Proyectos TIC:</span>
                <span className="font-bold font-tabular text-slate-900">{projects.length}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-emerald-50 border border-emerald-100">
                <span className="text-emerald-900 font-medium">Completados / Entregados:</span>
                <span className="font-bold font-tabular text-emerald-700">{completados.length}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-blue-50 border border-blue-100">
                <span className="text-blue-900 font-medium">En Ejecución Regular:</span>
                <span className="font-bold font-tabular text-blue-700">
                  {projects.filter((p) => p.executionStatus === 'En Plazo').length}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-amber-50 border border-amber-100">
                <span className="text-amber-900 font-medium">En Riesgo de Plazo:</span>
                <span className="font-bold font-tabular text-amber-700">{enRiesgo.length}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-rose-50 border border-rose-100">
                <span className="text-rose-900 font-medium">Atrasados Críticos:</span>
                <span className="font-bold font-tabular text-rose-700">{atrasados.length}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-purple-50 border border-purple-100">
                <span className="text-purple-900 font-medium">Extrapresupuestarios:</span>
                <span className="font-bold font-tabular text-purple-700">{extrapresupuestarios.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* NUEVA SECCIÓN: TRAZABILIDAD DEL DINERO (SANKY INTERACTIVO) */}
      {/* ========================================================= */}
      <SankeyTraceability projects={projects} />
    </div>
  );
};

// =========================================================
// COMPONENTE: SANKEY DE TRAZABILIDAD DEL DINERO
// =========================================================

type SelectedNodeDetail = {
  type: 'cuenta' | 'area' | 'proyecto' | 'flow1' | 'flow2';
  id: string;
  name: string;
  code?: string;
  sourceCode?: string;
  sourceId?: string;
  targetId?: string;
  targetName?: string;
};

const SankeyTraceability: React.FC<{ projects: Project[] }> = ({ projects }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SelectedNodeDetail | null>(null);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#14b8a6', '#64748b'];
  const AREA_COLOR = '#10b981';
  const PROJ_COLOR = '#f59e0b';

  const sankeyData = useMemo(() => {
    const cuentaMap = new Map<string, { id: string, name: string, value: number, code: string }>();
    const areaMap = new Map<string, { id: string, name: string, value: number }>();
    const projMap = new Map<string, { id: string, name: string, value: number, code: string, shortTitle: string }>();
    
    const links1 = new Map<string, { source: string, target: string, value: number }>();
    const links2 = new Map<string, { source: string, target: string, value: number }>();

    projects.forEach(p => {
      p.items.forEach(it => {
        const monto = it.montoEjecutadoFinalCLP || it.montoCotizadoCLP || (it.apreApprovedCLP || 0);
        if (monto <= 0) return;

        const cuentaCode = it.accountCode || 'Sin Cuenta';
        const cuentaName = getAccountByCode(cuentaCode)?.name || 'Sin Cuenta';
        const areaName = p.area;
        const projCode = p.code;
        const projTitle = p.title;

        const cId = `c-${cuentaCode}`;
        const aId = `a-${areaName}`;
        const pId = `p-${p.id}`;

        if (!cuentaMap.has(cId)) cuentaMap.set(cId, { id: cId, name: cuentaName, value: 0, code: cuentaCode });
        cuentaMap.get(cId)!.value += monto;

        if (!areaMap.has(aId)) areaMap.set(aId, { id: aId, name: areaName, value: 0 });
        areaMap.get(aId)!.value += monto;

        if (!projMap.has(pId)) projMap.set(pId, { id: pId, name: projTitle, value: 0, code: projCode, shortTitle: projTitle.substring(0, 30) + (projTitle.length > 30 ? '...' : '') });
        projMap.get(pId)!.value += monto;

        const l1Id = `${cId}->${aId}`;
        if (!links1.has(l1Id)) links1.set(l1Id, { source: cId, target: aId, value: 0 });
        links1.get(l1Id)!.value += monto;

        const l2Id = `${aId}->${pId}`;
        if (!links2.has(l2Id)) links2.set(l2Id, { source: aId, target: pId, value: 0 });
        links2.get(l2Id)!.value += monto;
      });
    });

    // Función mejorada que guarda los IDs originales para los grupos "Otros"
    const groupTop = <T extends { id: string, name: string, value: number }>(arr: T[], topN: number, otherName: string): (T & { originalIds?: string[] })[] => {
      arr.sort((a, b) => b.value - a.value);
      if (arr.length <= topN) return arr.map(item => ({ ...item, originalIds: [item.id] }));
      
      const top = arr.slice(0, topN).map(item => ({ ...item, originalIds: [item.id] }));
      const rest = arr.slice(topN);
      const otherValue = rest.reduce((sum, item) => sum + item.value, 0);
      const otherId = `other-${otherName.replace(/\s/g, '')}`;
      
      const otherNode = { 
        id: otherId, 
        name: `${otherName} (${rest.length})`, 
        value: otherValue,
        originalIds: rest.map(r => r.id)
      } as T & { originalIds?: string[] };
      
      return [...top, otherNode];
    };

    const topCuentas = groupTop(Array.from(cuentaMap.values()), 6, 'Otras Cuentas');
    const topAreas = groupTop(Array.from(areaMap.values()), 6, 'Otras Áreas');
    const topProjs = groupTop(Array.from(projMap.values()), 8, 'Otros Proyectos');

    const mapToTop = (id: string, topList: { id: string }[], otherIdPrefix: string) => {
      if (topList.some(x => x.id === id)) return id;
      const otherNode = topList.find(x => x.id.startsWith(`other-${otherIdPrefix}`));
      return otherNode ? otherNode.id : id;
    };

    const newLinks1 = new Map<string, { source: string, target: string, value: number }>();
    links1.forEach(l => {
      const src = mapToTop(l.source, topCuentas, 'OtrasCuentas');
      const tgt = mapToTop(l.target, topAreas, 'OtrasÁreas');
      const key = `${src}->${tgt}`;
      if (!newLinks1.has(key)) newLinks1.set(key, { source: src, target: tgt, value: 0 });
      newLinks1.get(key)!.value += l.value;
    });

    const newLinks2 = new Map<string, { source: string, target: string, value: number }>();
    links2.forEach(l => {
      const src = mapToTop(l.source, topAreas, 'OtrasÁreas');
      const tgt = mapToTop(l.target, topProjs, 'OtrosProyectos');
      const key = `${src}->${tgt}`;
      if (!newLinks2.has(key)) newLinks2.set(key, { source: src, target: tgt, value: 0 });
      newLinks2.get(key)!.value += l.value;
    });

    return {
      cuentas: topCuentas,
      areas: topAreas,
      projs: topProjs,
      links1: Array.from(newLinks1.values()),
      links2: Array.from(newLinks2.values()),
      total: topCuentas.reduce((s, c) => s + c.value, 0)
    };
  }, [projects]);

  const layout = useMemo(() => {
    const { cuentas, areas, projs, links1, links2, total } = sankeyData;
    if (total === 0) return null;

    const width = 1600; 
    const height = 1000;
    const paddingY = 24;
    const colWidth = 160;
    
    const col1X = 250; 
    const col2X = 720; 
    const col3X = 1200; 

    const positionNodes = (nodes: any[], xPos: number, colorFn?: (n: any, i: number) => string) => {
      const totalPadding = paddingY * (nodes.length - 1);
      const availableH = height - totalPadding - 120;
      let currentY = 60;
      
      return nodes.map((n, i) => {
        const h = (n.value / total) * availableH;
        const node = { 
          ...n, 
          x: xPos, 
          y: currentY, 
          h: Math.max(h, 6), 
          w: colWidth, 
          offsetOut: 0, 
          offsetIn: 0,
          color: colorFn ? colorFn(n, i) : undefined
        };
        currentY += h + paddingY;
        return node;
      });
    };

    const posCuentas = positionNodes(cuentas, col1X, (n, i) => n.id.startsWith('other') ? '#64748b' : COLORS[i % COLORS.length]);
    const posAreas = positionNodes(areas, col2X, () => AREA_COLOR);
    const posProjs = positionNodes(projs, col3X, () => PROJ_COLOR);

    const calcLinks = (links: any[], sourceNodes: any[], targetNodes: any[]) => {
      sourceNodes.forEach(n => n.offsetOut = 0);
      targetNodes.forEach(n => n.offsetIn = 0);

      return links.map(l => {
        const src = sourceNodes.find(n => n.id === l.source);
        const tgt = targetNodes.find(n => n.id === l.target);
        if (!src || !tgt) return null;

        const sourceH = (l.value / src.value) * src.h;
        const targetH = (l.value / tgt.value) * tgt.h;

        const sourceY = src.y + src.offsetOut + sourceH / 2;
        const targetY = tgt.y + tgt.offsetIn + targetH / 2;
        
        src.offsetOut += sourceH;
        tgt.offsetIn += targetH;

        return {
          ...l,
          sourceX: src.x + src.w,
          sourceY,
          targetX: tgt.x,
          targetY,
          sourceH,
          targetH,
          sourceName: src.name,
          targetName: tgt.name,
          color: src.color || '#3b82f6'
        };
      }).filter(Boolean);
    };

    const posLinks1 = calcLinks(links1, posCuentas, posAreas);
    const posLinks2 = calcLinks(links2, posAreas, posProjs);

    return { posCuentas, posAreas, posProjs, posLinks1, posLinks2, total, width, height };
  }, [sankeyData, COLORS, AREA_COLOR, PROJ_COLOR]);

  // Lógica para calcular los detalles del modal según el nodo O FLUJO seleccionado
  const modalData = useMemo(() => {
    if (!selectedDetail) return null;

    const itemsWithMonto = projects.flatMap(p => 
      p.items.map(it => ({
        ...it,
        project: p,
        montoUtilizado: it.montoEjecutadoFinalCLP || it.montoCotizadoCLP || (it.apreApprovedCLP || 0)
      }))
    ).filter(it => it.montoUtilizado > 0);

    let filteredItems = [];
    
    if (selectedDetail.type === 'cuenta') {
      filteredItems = itemsWithMonto.filter(it => it.accountCode === selectedDetail.code);
    } else if (selectedDetail.type === 'area') {
      filteredItems = itemsWithMonto.filter(it => it.project.area === selectedDetail.name);
    } else if (selectedDetail.type === 'proyecto') {
      const projId = selectedDetail.id.replace('p-', '');
      filteredItems = itemsWithMonto.filter(it => it.project.id === projId);
    } else if (selectedDetail.type === 'flow1') {
      // Flujo: Cuenta -> Área
      const targetNode = sankeyData.areas.find(a => a.id === selectedDetail.targetId);
      const targetIds = targetNode?.originalIds || [];
      filteredItems = itemsWithMonto.filter(it => 
        it.accountCode === selectedDetail.sourceCode && 
        targetIds.includes(`a-${it.project.area}`)
      );
    } else if (selectedDetail.type === 'flow2') {
      // Flujo: Área -> Proyecto
      const sourceNode = sankeyData.areas.find(a => a.id === selectedDetail.sourceId);
      const sourceIds = sourceNode?.originalIds || [];
      const targetNode = sankeyData.projs.find(p => p.id === selectedDetail.targetId);
      const targetIds = targetNode?.originalIds || [];
      
      filteredItems = itemsWithMonto.filter(it => 
        sourceIds.includes(`a-${it.project.area}`) && 
        targetIds.includes(`p-${it.project.id}`)
      );
    }

    const total = filteredItems.reduce((s, it) => s + it.montoUtilizado, 0);
    return { items: filteredItems.sort((a, b) => b.montoUtilizado - a.montoUtilizado), total };
  }, [selectedDetail, projects, sankeyData]);


  if (!layout) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs">
        <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Sin flujo de dinero registrado</h3>
        <p className="text-sm text-slate-500 mt-1">Aún no hay ejecuciones ni compromisos que trazar para este año fiscal.</p>
      </div>
    );
  }

  const { posCuentas, posAreas, posProjs, posLinks1, posLinks2, total, width, height } = layout;

  const getLinkOpacity = (l: any, type: 'l1' | 'l2') => {
    if (hoveredLink === `${type}-${l.source}-${l.target}`) return 0.9;
    if (hoveredNode) {
      if (l.source === hoveredNode || l.target === hoveredNode) return 0.6;
      return 0.1;
    }
    return 0.3;
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-xs mt-6 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <GitBranch className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Trazabilidad del Dinero (Flujo Ejecutado y Comprometido)
              </h3>
            </div>
            <p className="text-sm text-slate-500 mt-1 ml-9 flex items-center gap-2">
              Visualización Sankey: Cuentas &rarr; Áreas &rarr; Proyectos
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold border border-amber-200">
                💡 Haz clic en un nodo o en una línea para ver el desglose
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500"></span> Cuentas</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500"></span> Áreas</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500"></span> Proyectos</span>
          </div>
        </div>

        <div className="relative w-full overflow-x-auto bg-slate-900 rounded-xl p-2 md:p-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            
            {/* Links Nivel 1 (Cuentas -> Áreas) */}
            {posLinks1.map((l, i) => (
              <path 
                key={`l1-${i}`} 
                d={`M ${l.sourceX} ${l.sourceY} C ${l.sourceX + (l.targetX - l.sourceX) / 2} ${l.sourceY}, ${l.targetX - (l.targetX - l.sourceX) / 2} ${l.targetY}, ${l.targetX} ${l.targetY}`} 
                fill="none" 
                stroke={l.color} 
                strokeWidth={Math.max(2, l.sourceH)} 
                strokeOpacity={getLinkOpacity(l, 'l1')} 
                onMouseEnter={() => setHoveredLink(`l1-${l.source}-${l.target}`)} 
                onMouseLeave={() => setHoveredLink(null)} 
                onClick={() => setSelectedDetail({ 
                  type: 'flow1', 
                  id: 'flow1', 
                  name: `Flujo: ${l.sourceName} → ${l.targetName}`, 
                  sourceCode: l.source.replace('c-', ''), 
                  targetId: l.target 
                })}
                className="transition-all duration-200 cursor-pointer hover:stroke-opacity-100"
              >
                <title>{`${l.sourceName} → ${l.targetName}: ${formatCLP(l.value)}\nClick para ver el desglose`}</title>
              </path>
            ))}

            {/* Links Nivel 2 (Áreas -> Proyectos) */}
            {posLinks2.map((l, i) => (
              <path 
                key={`l2-${i}`} 
                d={`M ${l.sourceX} ${l.sourceY} C ${l.sourceX + (l.targetX - l.sourceX) / 2} ${l.sourceY}, ${l.targetX - (l.targetX - l.sourceX) / 2} ${l.targetY}, ${l.targetX} ${l.targetY}`} 
                fill="none" 
                stroke={PROJ_COLOR} 
                strokeWidth={Math.max(2, l.sourceH)} 
                strokeOpacity={getLinkOpacity(l, 'l2')} 
                onMouseEnter={() => setHoveredLink(`l2-${l.source}-${l.target}`)} 
                onMouseLeave={() => setHoveredLink(null)} 
                onClick={() => setSelectedDetail({ 
                  type: 'flow2', 
                  id: 'flow2', 
                  name: `Flujo: ${l.sourceName} → ${l.targetName}`, 
                  sourceId: l.source, 
                  targetId: l.target 
                })}
                className="transition-all duration-200 cursor-pointer hover:stroke-opacity-100"
              >
                <title>{`${l.sourceName} → ${l.targetName}: ${formatCLP(l.value)}\nClick para ver el desglose`}</title>
              </path>
            ))}

            {/* Nodos: Cuentas */}
            {posCuentas.map((n) => (
              <g key={n.id} onMouseEnter={() => setHoveredNode(n.id)} onMouseLeave={() => setHoveredNode(null)} onClick={() => setSelectedDetail({ type: 'cuenta', id: n.id, name: n.name, code: n.code })} className="cursor-pointer">
                <rect x={n.x} y={n.y} width={n.w} height={n.h} fill={n.color} rx={4} className={`transition-all duration-200 ${hoveredNode === n.id ? 'stroke-white stroke-2 shadow-lg' : ''}`}>
                  <title>{`${n.code} · ${n.name}: ${formatCLP(n.value)}\nClick para ver detalles`}</title>
                </rect>
                <text x={n.x - 12} y={n.y + n.h / 2 - 8} textAnchor="end" dominantBaseline="middle" fill="#ffffff" fontSize={15} fontWeight="bold" className="pointer-events-none drop-shadow-md">{n.code}</text>
                <text x={n.x - 12} y={n.y + n.h / 2 + 10} textAnchor="end" dominantBaseline="middle" fill="#94a3b8" fontSize={13} className="pointer-events-none">{n.name.length > 25 ? n.name.substring(0, 25) + '...' : n.name}</text>
              </g>
            ))}

            {/* Nodos: Áreas */}
            {posAreas.map((n) => (
              <g key={n.id} onMouseEnter={() => setHoveredNode(n.id)} onMouseLeave={() => setHoveredNode(null)} onClick={() => setSelectedDetail({ type: 'area', id: n.id, name: n.name })} className="cursor-pointer">
                <rect x={n.x} y={n.y} width={n.w} height={n.h} fill={n.color} rx={4} className={`transition-all duration-200 ${hoveredNode === n.id ? 'stroke-white stroke-2 shadow-lg' : ''}`}>
                  <title>{`${n.name}: ${formatCLP(n.value)}\nClick para ver detalles`}</title>
                </rect>
                <text x={n.x + n.w / 2} y={n.y - 12} textAnchor="middle" dominantBaseline="middle" fill="#e2e8f0" fontSize={14} fontWeight="bold" className="pointer-events-none drop-shadow-md">{n.name}</text>
              </g>
            ))}

            {/* Nodos: Proyectos */}
            {posProjs.map((n) => (
              <g key={n.id} onMouseEnter={() => setHoveredNode(n.id)} onMouseLeave={() => setHoveredNode(null)} onClick={() => setSelectedDetail({ type: 'proyecto', id: n.id, name: n.name, code: n.code })} className="cursor-pointer">
                <rect x={n.x} y={n.y} width={n.w} height={n.h} fill={n.color} rx={4} className={`transition-all duration-200 ${hoveredNode === n.id ? 'stroke-white stroke-2 shadow-lg' : ''}`}>
                  <title>{`${n.name}: ${formatCLP(n.value)}\nClick para ver detalles`}</title>
                </rect>
                <text x={n.x + n.w + 12} y={n.y + n.h / 2 - 8} textAnchor="start" dominantBaseline="middle" fill="#ffffff" fontSize={14} fontWeight="bold" className="pointer-events-none drop-shadow-md">{n.code}</text>
                <text x={n.x + n.w + 12} y={n.y + n.h / 2 + 10} textAnchor="start" dominantBaseline="middle" fill="#94a3b8" fontSize={12} className="pointer-events-none">{n.shortTitle || n.name}</text>
              </g>
            ))}
          </svg>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <p>El grosor de cada flujo representa el monto utilizado. Pasa el mouse para ver el resumen.</p>
          <p className="font-semibold text-slate-700">Total Trazado: {formatCLP(total)}</p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL DE DETALLE (DRILL-DOWN) */}
      {/* ========================================================= */}
      {selectedDetail && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Header del Modal */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                    selectedDetail.type === 'cuenta' ? 'bg-blue-100 text-blue-800' :
                    selectedDetail.type === 'area' ? 'bg-emerald-100 text-emerald-800' :
                    selectedDetail.type === 'proyecto' ? 'bg-amber-100 text-amber-800' :
                    'bg-indigo-100 text-indigo-800'
                  }`}>
                    {selectedDetail.type === 'flow1' || selectedDetail.type === 'flow2' 
                      ? 'Detalle de Flujo Específico' 
                      : `Detalle de ${selectedDetail.type}`}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-sm font-semibold text-slate-500">
                    {modalData.items.length} ítems encontrados
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {selectedDetail.code ? `${selectedDetail.code} · ` : ''}{selectedDetail.name}
                </h3>
                <p className="text-lg font-bold text-indigo-600 mt-1 font-tabular">
                  Total Utilizado: {formatCLP(modalData.total)}
                </p>
              </div>
              <button onClick={() => setSelectedDetail(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cuerpo del Modal (Tabla) */}
            <div className="p-0 overflow-y-auto flex-1 bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Descripción del Ítem</th>
                    
                    {/* Mostrar columna Proyecto si NO es un flujo directo a un proyecto único */}
                    {selectedDetail.type !== 'proyecto' && selectedDetail.type !== 'flow2' && (
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Proyecto / Área</th>
                    )}
                    
                    {/* Mostrar columna Cuenta si NO es un flujo que viene de una cuenta única */}
                    {selectedDetail.type !== 'cuenta' && selectedDetail.type !== 'flow1' && (
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Cuenta</th>
                    )}
                    
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Monto Utilizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalData.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{it.description}</p>
                        {it.justification && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{it.justification}</p>}
                      </td>
                      
                      {selectedDetail.type !== 'proyecto' && selectedDetail.type !== 'flow2' && (
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-800">{it.project.code}</p>
                          <p className="text-xs text-slate-500">{it.project.title}</p>
                          <p className="text-xs font-medium text-blue-600 mt-1">{it.project.area}</p>
                        </td>
                      )}
                      
                      {selectedDetail.type !== 'cuenta' && selectedDetail.type !== 'flow1' && (
                        <td className="px-6 py-4">
                          <p className="text-sm font-mono text-slate-800">{it.accountCode || 'S/C'}</p>
                          <p className="text-xs text-slate-500">{getAccountByCode(it.accountCode)?.name || 'Sin cuenta'}</p>
                        </td>
                      )}
                      
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-bold text-slate-900 font-tabular">{formatCLP(it.montoUtilizado)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {it.montoEjecutadoFinalCLP ? 'Ejecutado Final' : it.montoCotizadoCLP ? 'Cotizado' : 'Aprobado APRE'}
                        </p>
                      </td>
                    </tr>
                  ))}
                  {modalData.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                        No hay ítems individuales para mostrar en esta agrupación (corresponde al grupo "Otros").
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Footer del Modal */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button onClick={() => setSelectedDetail(null)} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded-lg transition-colors">
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};