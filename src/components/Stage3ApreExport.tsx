import React, { useState, useRef, useEffect } from 'react';
import { Project, Role, ApreApprovedRecord } from '../types/budget';
import { formatCLP, parseApreApprovedCSV } from '../utils/formatters';
import { REAL_APRE_APPROVED_TALCA_2026 } from '../data/realApreApproved2026';
import { isSupabaseConfigured } from '../lib/supabase';
import { 
  fetchApreRecordsFromDatabase, 
  saveApreRecordsToDatabase 
} from '../services/supabaseService';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Search, 
  RotateCcw,
  Printer,
  Copy,
  Check,
  Building2,
  TrendingUp,
  Download,
  Database
} from 'lucide-react';

interface Stage3ApreExportProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  currentRole: Role;
  onGoToNextStage: () => void;
}

export const Stage3ApreExport: React.FC<Stage3ApreExportProps> = ({
  projects,
  onUpdateProject,
  currentRole,
  onGoToNextStage,
}) => {
  // Load real APRE records by default, or from local storage if previously imported
  const [apreRecords, setApreRecords] = useState<ApreApprovedRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ua_talca_imported_apre_2026');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return REAL_APRE_APPROVED_TALCA_2026;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ACTIVOS' | 'GASTOS'>('all');
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with Supabase on mount if configured
  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchApreRecordsFromDatabase().then((dbRecords) => {
        if (dbRecords && dbRecords.length > 0) {
          setApreRecords(dbRecords);
        }
      });
    }
  }, []);

  // Financial Aggregations of the Approved APRE File
  const totalMontoApre = apreRecords.reduce((sum, r) => sum + r.montoTotal, 0);
  const totalEjecutadoApre = apreRecords.reduce((sum, r) => sum + r.montoEjecutado, 0);
  const totalSaldoApre = apreRecords.reduce((sum, r) => sum + r.saldo, 0);

  const totalActivosInversion = apreRecords
    .filter((r) => r.tipoCuenta === 'ACTIVOS' || r.grupoCuenta === 'INVERSIÓN')
    .reduce((sum, r) => sum + r.montoTotal, 0);

  const totalGastosOperacion = apreRecords
    .filter((r) => r.tipoCuenta === 'GASTOS' && r.grupoCuenta !== 'GASTOS EN PERSONAL')
    .reduce((sum, r) => sum + r.montoTotal, 0);

  // Formulated total for comparison
  const totalFormulado = projects.reduce((sum, p) => sum + p.requestedBudgetCLP, 0);
  const variacionApre = totalMontoApre - totalFormulado;

  // Handle file import from APRE
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const parsed = parseApreApprovedCSV(content);
      if (parsed.length === 0) {
        alert('No se pudieron reconocer filas válidas en el archivo CSV de APRE.');
        return;
      }

      setApreRecords(parsed);
      try {
        localStorage.setItem('ua_talca_imported_apre_2026', JSON.stringify(parsed));
      } catch (err) {
        // ignore
      }

      let extraMsg = '';
      if (isSupabaseConfigured()) {
        const ok = await saveApreRecordsToDatabase(parsed);
        if (ok) {
          extraMsg = ' y guardados en Supabase PostgreSQL.';
        }
      }

      setImportNotification(
        `¡Importación exitosa! Se cargaron ${parsed.length} registros aprobados por la plataforma APRE para Sede Talca${extraMsg}`
      );
      setTimeout(() => setImportNotification(null), 5000);
    };

    reader.readAsText(file, 'UTF-8');
    // reset input
    e.target.value = '';
  };

  // Restore Real 2026 Sede Talca APRE dataset
  const handleRestoreRealDataset = async () => {
    setApreRecords(REAL_APRE_APPROVED_TALCA_2026);
    try {
      localStorage.setItem('ua_talca_imported_apre_2026', JSON.stringify(REAL_APRE_APPROVED_TALCA_2026));
    } catch (e) {
      // ignore
    }

    if (isSupabaseConfigured()) {
      await saveApreRecordsToDatabase(REAL_APRE_APPROVED_TALCA_2026);
    }

    setImportNotification('Se ha recargado el conjunto oficial real aprobado por APRE 2026 (Sede Talca) y sincronizado con Supabase.');
    setTimeout(() => setImportNotification(null), 4000);
  };

  // Sync APRE figures into local project models
  const handleSyncProjectsWithAPRE = () => {
    let matchedCount = 0;

    projects.forEach((proj) => {
      // Try to find matching APRE records by keywords in title or area
      const matchingApre = apreRecords.filter((rec) => {
        const text = `${rec.detalle} ${rec.justificacion}`.toLowerCase();
        const pTitleWords = proj.title.toLowerCase().split(' ').filter((w) => w.length > 4);
        return pTitleWords.some((w) => text.includes(w)) || text.includes(proj.area.toLowerCase());
      });

      if (matchingApre.length > 0) {
        matchedCount++;
        const totalApreMatched = matchingApre.reduce((sum, r) => sum + r.montoTotal, 0);
        const totalEjecutadoMatched = matchingApre.reduce((sum, r) => sum + r.montoEjecutado, 0);
        const totalSaldoMatched = matchingApre.reduce((sum, r) => sum + r.saldo, 0);

        onUpdateProject({
          ...proj,
          apreCodigoPres: matchingApre[0].codigoPres,
          approvedCeilingCLP: totalApreMatched > 0 ? totalApreMatched : proj.requestedBudgetCLP,
          executedBudgetCLP: totalEjecutadoMatched,
          apreSaldoCLP: totalSaldoMatched,
          reviewStatus: totalApreMatched > 0 ? 'Aprobado' : 'Ajuste Solicitado',
        });
      }
    });

    setImportNotification(
      `Sincronización completada: Se asociaron ${matchedCount} proyectos locales con los techos y códigos PRES aprobados en APRE.`
    );
    setTimeout(() => setImportNotification(null), 5000);
  };

  // Copy APRE table to clipboard
  const handleCopyClipboard = () => {
    const textRows = apreRecords.map(
      (r) =>
        `${r.codigoPres}\t${r.cuentaContable}\t${r.detalle}\t${r.montoTotal}\t${r.montoEjecutado}\t${r.saldo}`
    );
    navigator.clipboard.writeText(textRows.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Filtered records
  const filteredRecords = apreRecords.filter((rec) => {
    const matchType =
      filterType === 'all'
        ? true
        : filterType === 'ACTIVOS'
        ? rec.tipoCuenta === 'ACTIVOS' || rec.grupoCuenta === 'INVERSIÓN'
        : rec.tipoCuenta === 'GASTOS' && rec.grupoCuenta !== 'GASTOS EN PERSONAL';

    const term = searchTerm.toLowerCase();
    const matchSearch =
      term === '' ||
      rec.codigoPres.toLowerCase().includes(term) ||
      rec.detalle.toLowerCase().includes(term) ||
      rec.cuentaContable.toLowerCase().includes(term) ||
      rec.justificacion.toLowerCase().includes(term);

    return matchType && matchSearch;
  });

  return (
    <div className="w-full space-y-6">
      {/* Hidden file input for importing APRE CSV */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.txt"
        className="hidden"
      />

      {/* Import Notification Banner */}
      {importNotification && (
        <div className="p-3.5 bg-emerald-900 text-white text-sm font-semibold rounded-lg shadow-md border border-emerald-700 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{importNotification}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-emerald-200 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Context */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#da291c] uppercase tracking-wider mb-1">
              <span>Etapa 3 de 5</span>
              <span>·</span>
              <span>Recepción & Aprobación Oficial APRE</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Aprobación de APRE (Director + Paola)
            </h2>
            <p className="text-base text-slate-600 mt-1 max-w-4xl">
              Importación y auditoría del archivo de presupuesto aprobado devuelto por la plataforma corporativa <strong>APRE</strong> para el ejercicio 2026. Contrasta montos aprobados, códigos de presupuesto (CÓDIGO PRES) y saldos disponibles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Import CSV Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-[#ff6900] hover:bg-[#e05c00] text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-sm cursor-pointer"
              title="Importar archivo CSV emitido por la plataforma APRE corporativa"
            >
              <Upload className="w-4 h-4" />
              <span>Importar CSV de APRE</span>
            </button>

            {/* Reload Real Screenshot Dataset Button */}
            <button
              onClick={handleRestoreRealDataset}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-2.5 rounded-lg border border-[#d2d2d2] transition-colors text-xs cursor-pointer"
              title="Cargar los datos reales exactos de la planilla APRE Talca 2026"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#da291c]" />
              <span>Cargar Datos Reales APRE</span>
            </button>

            {/* Sync With Projects Button */}
            <button
              onClick={handleSyncProjectsWithAPRE}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold px-3 py-2.5 rounded-lg border border-[#d2d2d2] transition-colors text-xs cursor-pointer"
              title="Vincular techos y códigos PRES aprobados con los proyectos formulados"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#ff6900]" />
              <span>Sincronizar con Proyectos</span>
            </button>

            <button
              onClick={onGoToNextStage}
              className="flex items-center gap-2 bg-[#da291c] hover:bg-[#b81e13] text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-sm cursor-pointer ring-1 ring-white/20"
            >
              <span>Avanzar a Readecuación</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Large Strategic Metric Cards derived from APRE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Aprobado APRE 2026</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                {apreRecords.length} ítems
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 font-tabular mt-1">
              {formatCLP(totalMontoApre)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Sucursal: TALCA · Centro 621007
            </p>
          </div>

          <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-900 uppercase">Inversión (Activos / CAPEX)</p>
            <p className="text-2xl font-bold text-blue-900 font-tabular mt-1">
              {formatCLP(totalActivosInversion)}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Equipos Computacionales, Redes, CCTV
            </p>
          </div>

          <div className="p-4 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-900 uppercase">Gastos de Operación (OPEX)</p>
            <p className="text-2xl font-bold text-emerald-900 font-tabular mt-1">
              {formatCLP(totalGastosOperacion)}
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Servicios informáticos, soporte y mantención
            </p>
          </div>

          {/* Saldo Vigente en Amarillo como en la planilla real */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-amber-950 uppercase">Saldo Disponible Real</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                Columna Saldo APRE
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-900 font-tabular mt-1">
              {formatCLP(totalSaldoApre)}
            </p>
            <p className="text-xs text-amber-800 mt-1">
              {totalEjecutadoApre > 0
                ? `Ejecutado: ${formatCLP(totalEjecutadoApre)}`
                : '100% disponible al inicio del año'}
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Strip: Formulación Local vs APRE Aprobado */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-slate-100">
              Contraste Institucional: Formulación Local vs Aprobación Junta Directiva (APRE)
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Comparativa entre lo formulado por Sede Talca y la resolución financiera corporativa oficial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[11px] text-slate-400 block">Formulado Talca</span>
            <span className="text-base font-bold font-tabular text-slate-200">
              {formatCLP(totalFormulado)}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-700 hidden sm:block" />

          <div>
            <span className="text-[11px] text-blue-300 block">Aprobado APRE 2026</span>
            <span className="text-base font-bold font-tabular text-blue-300">
              {formatCLP(totalMontoApre)}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-700 hidden sm:block" />

          <div>
            <span className="text-[11px] text-slate-400 block">Diferencia / Ajuste</span>
            <span
              className={`text-base font-bold font-tabular ${
                variacionApre < 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {variacionApre >= 0 ? `+ ${formatCLP(variacionApre)}` : `- ${formatCLP(Math.abs(variacionApre))}`}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar for APRE Records */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código PRES, detalle, cuenta o justificación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({apreRecords.length})
            </button>
            <button
              onClick={() => setFilterType('ACTIVOS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'ACTIVOS'
                  ? 'bg-blue-100 text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activos / Inversión
            </button>
            <button
              onClick={() => setFilterType('GASTOS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'GASTOS'
                  ? 'bg-emerald-100 text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gastos de Operación
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md"
            title="Copiar tabla al portapapeles"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Real APRE Institutional Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Presupuesto Aprobado APRE 2026 · Sede Talca (Centro Costo 621007 - INFORMÁTICA)
            </h3>
            <p className="text-xs text-slate-500">
              Datos oficiales vigentes con codificación de la Dirección de Gestión y Administración Financiera (DGAF).
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-900 bg-blue-100 px-2.5 py-1 rounded">
            {filteredRecords.length} registros cargados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Distribución</th>
                <th className="py-3 px-3">Cód. Pres</th>
                <th className="py-3 px-3">Tipo / Grupo</th>
                <th className="py-3 px-3">Cuenta Contable</th>
                <th className="py-3 px-3">Detalle del Requerimiento</th>
                <th className="py-3 px-3">Justificación APRE</th>
                <th className="py-3 px-3 text-right">Monto Total</th>
                <th className="py-3 px-3 text-right">Ejecutado</th>
                <th className="py-3 px-3 text-right bg-amber-100/70 border-x border-amber-200">Saldo (CLP)</th>
                <th className="py-3 px-3 text-center">Usuario Cre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
              {filteredRecords.map((rec, index) => {
                const isZero = rec.montoTotal === 0;

                return (
                  <tr
                    key={`${rec.codigoPres}-${index}`}
                    className={`hover:bg-slate-50 transition-colors ${
                      isZero ? 'bg-slate-50/60 opacity-60' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {rec.distribucion}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                      {rec.codigoPres}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          rec.tipoCuenta === 'ACTIVOS' || rec.grupoCuenta === 'INVERSIÓN'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {rec.tipoCuenta === 'ACTIVOS' ? 'INVERSIÓN' : 'GASTO OPEX'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-900">
                      <span className="font-mono text-slate-600 mr-1">{rec.codigoCuenta}</span>
                      <span>{rec.cuentaContable}</span>
                    </td>

                    <td className="py-2.5 px-3 max-w-[240px] truncate font-semibold text-slate-900" title={rec.detalle}>
                      {rec.detalle}
                    </td>

                    <td className="py-2.5 px-3 max-w-[260px] truncate text-slate-600" title={rec.justificacion}>
                      {rec.justificacion}
                    </td>

                    <td className="py-2.5 px-3 text-right font-tabular font-bold text-slate-900 whitespace-nowrap">
                      {formatCLP(rec.montoTotal)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-tabular text-slate-600 whitespace-nowrap">
                      {rec.montoEjecutado > 0 ? formatCLP(rec.montoEjecutado) : '$ 0'}
                    </td>

                    {/* Saldo highlighted column in yellow like in the real spreadsheet */}
                    <td className="py-2.5 px-3 text-right font-tabular font-bold text-amber-950 bg-amber-50/80 border-x border-amber-200 whitespace-nowrap">
                      {formatCLP(rec.saldo)}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap text-[10px] text-slate-500 font-mono">
                      {rec.usuarioCre?.split(' ')[0] || 'EDISON'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900 text-xs">
              <tr>
                <td colSpan={6} className="py-3 px-3 text-right text-sm">
                  Total Consolidado Aprobado por APRE (Sede Talca):
                </td>
                <td className="py-3 px-3 text-right font-tabular text-sm text-slate-900">
                  {formatCLP(filteredRecords.reduce((sum, r) => sum + r.montoTotal, 0))}
                </td>
                <td className="py-3 px-3 text-right font-tabular text-sm text-slate-600">
                  {formatCLP(filteredRecords.reduce((sum, r) => sum + r.montoEjecutado, 0))}
                </td>
                <td className="py-3 px-3 text-right font-tabular text-sm text-amber-950 bg-amber-100/80 border-x border-amber-300">
                  {formatCLP(filteredRecords.reduce((sum, r) => sum + r.saldo, 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Navigation to Stage 4 Readecuación Presupuestaria */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Siguiente Paso: Readecuación Presupuestaria
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Una vez verificado el archivo de APRE con los techos aprobados por la Junta, proceda a ajustar y rebalancear la cartera de proyectos en la Etapa 4.
          </p>
        </div>

        <button
          onClick={onGoToNextStage}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm shrink-0"
        >
          <span>Ir a Readecuación Presupuestaria</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
