import React from 'react';
import { Project, Role, StageId, OFFICIAL_AREAS } from '../types/budget';
import { formatCLP, OFFICIAL_ACCOUNTS, getAccountByCode } from '../utils/formatters';
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
  Sparkles 
} from 'lucide-react';

interface DashboardGerencialProps {
  projects: Project[];
  currentRole: Role;
  onNavigateToStage: (stage: StageId) => void;
}

export const DashboardGerencial: React.FC<DashboardGerencialProps> = ({
  projects,
  currentRole,
  onNavigateToStage,
}) => {
  // Global Aggregations
  const totalSolicitado = projects.reduce((sum, p) => sum + p.requestedBudgetCLP, 0);
  const totalAprobado = projects.reduce((sum, p) => sum + (p.approvedCeilingCLP ?? p.requestedBudgetCLP), 0);
  const totalEjecutado = projects.reduce((sum, p) => sum + p.executedBudgetCLP, 0);
  const totalDisponible = Math.max(0, totalAprobado - totalEjecutado);
  const executionRate = totalAprobado > 0 ? Math.round((totalEjecutado / totalAprobado) * 100) : 0;

  // Delayed and risk projects
  const atrasados = projects.filter((p) => p.executionStatus === 'Atrasado');
  const enRiesgo = projects.filter((p) => p.executionStatus === 'En Riesgo');
  const completados = projects.filter((p) => p.executionStatus === 'Completado');
  const extrapresupuestarios = projects.filter((p) => p.isExtrapresupuestario);

  // Group by Area TIC
  const areasList = OFFICIAL_AREAS;
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

  // Group by Account
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

  // Account execution details
  const accountsData = OFFICIAL_ACCOUNTS.map((acc) => {
    const accItems = allItems.filter((it) => it.accountCode === acc.code);
    const budget = accItems.reduce((sum, it) => sum + it.totalPriceCLP, 0);
    // Estimated executed proportional to parent project progress
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

  // Identify subexecution risk accounts (budget > $5M and execution < 30%)
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
              Tablero de Control Gerencial TIC 2026
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

        {/* 4 Major Master KPIs */}
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
        {/* Delayed Projects Alert Box */}
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

        {/* Subexecution Risk Alert Box */}
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
        {/* Left Column: Spending by Area TIC (2/3 width) */}
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

                {/* Comparative Double Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden relative">
                  {/* Total allocated share relative to max */}
                  <div
                    className="h-3 rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, (a.budget / totalAprobado) * 100 * 2.5)}%` }}
                  />
                  {/* Executed fill */}
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

        {/* Right Column: CAPEX vs OPEX & Portfolio Breakdown (1/3 width) */}
        <div className="space-y-6">
          {/* CAPEX vs OPEX Card */}
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

            {/* Visual Ratio Bar */}
            <div className="space-y-3">
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100">
                <div
                  className="bg-blue-600 transition-all"
                  style={{ width: `${capexPercent}%` }}
                  title={`CAPEX: ${capexPercent}%`}
                />
                <div
                  className="bg-emerald-600 transition-all"
                  style={{ width: `${opexPercent}%` }}
                  title={`OPEX: ${opexPercent}%`}
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

          {/* Project Portfolio Status Summary */}
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
    </div>
  );
};
