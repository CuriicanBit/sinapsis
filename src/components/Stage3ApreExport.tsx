import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Project, Role, ApreApprovedRecord } from '../types/budget';
import { formatCLP, parseApreApprovedCSV, suggestExclusion } from '../utils/formatters';
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
  Database,
  Info,
  CheckCheck,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface Stage3ApreExportProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  currentRole: Role;
  onGoToNextStage: () => void;
  currentFiscalYear?: number;
}

export const Stage3ApreExport: React.FC<Stage3ApreExportProps> = ({
  projects,
  onUpdateProject,
  currentRole,
  onGoToNextStage,
  currentFiscalYear = 2026,
}) => {
  const getRecordKey = (r: ApreApprovedRecord) => `${r.codigoPres}|${r.detalle}`;

  const initSuggestions = (records: ApreApprovedRecord[]) => {
    const map = new Map<string, { excluded: boolean; reason?: string }>();
    records.forEach((r) => {
      const s = suggestExclusion(r);
      map.set(getRecordKey(r), {
        excluded: s.excluded,
        reason: s.reason || undefined,
      });
    });
    return map;
  };

  // Estado de registros APRE (la única fuente de verdad es Supabase)
  const [apreRecords, setApreRecords] = useState<ApreApprovedRecord[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalSuggestions, setOriginalSuggestions] = useState<Map<string, { excluded: boolean; reason?: string }>>(() => new Map());

  // Cargar registros desde Supabase al montar o al cambiar de año fiscal
  useEffect(() => {
    setApreRecords([]);
    setOriginalSuggestions(new Map());
    setHasUnsavedChanges(false);

    if (isSupabaseConfigured()) {
      fetchApreRecordsFromDatabase(currentFiscalYear).then((dbRecords) => {
        if (dbRecords && dbRecords.length > 0) {
          const mapped = dbRecords.map((r) => ({
            ...r,
            excluded: r.excluded === undefined ? false : Boolean(r.excluded),
          }));
          setApreRecords(mapped);
          setOriginalSuggestions(initSuggestions(mapped));
        }
      });
    }
  }, [currentFiscalYear]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ACTIVOS' | 'GASTOS'>('all');
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter into active and excluded
  const activeRecords = apreRecords.filter((r) => !r.excluded);
  const excludedRecords = apreRecords.filter((r) => r.excluded);

  const includedCount = activeRecords.length;
  const excludedCount = excludedRecords.length;

  // Financial Aggregations of the Approved APRE File (ONLY included records)
  const totalMontoApre = apreRecords.filter((r) => !r.excluded).reduce((sum, r) => sum + r.montoTotal, 0);
  const totalEjecutadoApre = apreRecords.filter((r) => !r.excluded).reduce((sum, r) => sum + r.montoEjecutado, 0);
  const totalSaldoApre = apreRecords.filter((r) => !r.excluded).reduce((sum, r) => sum + r.saldo, 0);

  const totalActivosInversion = apreRecords
    .filter((r) => !r.excluded && (r.tipoCuenta === 'ACTIVOS' || r.grupoCuenta === 'INVERSIÓN'))
    .reduce((sum, r) => sum + r.montoTotal, 0);

  const totalGastosOperacion = apreRecords
    .filter((r) => !r.excluded && r.tipoCuenta === 'GASTOS' && r.grupoCuenta !== 'GASTOS EN PERSONAL')
    .reduce((sum, r) => sum + r.montoTotal, 0);

  // Excluded breakdown for transparency
  const totalMontoExcluido = excludedRecords.reduce((sum, r) => sum + r.montoTotal, 0);
  const inversionExcluida = excludedRecords
    .filter((r) => r.tipoCuenta === 'ACTIVOS' || r.grupoCuenta === 'INVERSIÓN')
    .reduce((sum, r) => sum + r.montoTotal, 0);
  const gastosExcluidos = excludedRecords
    .filter((r) => r.tipoCuenta === 'GASTOS' && r.grupoCuenta !== 'GASTOS EN PERSONAL')
    .reduce((sum, r) => sum + r.montoTotal, 0);
  const saldoExcluido = excludedRecords.reduce((sum, r) => sum + r.saldo, 0);

  // Formulated total for comparison
  const totalFormulado = projects.reduce((sum, p) => sum + p.requestedBudgetCLP, 0);
  const variacionApre = totalMontoApre - totalFormulado;

  // Actions for batch inclusion / exclusion
  const handleIncludeAll = () => {
    setApreRecords((prev) =>
      prev.map((r) => ({
        ...r,
        excluded: false,
        exclusionReason: undefined,
      }))
    );
    setHasUnsavedChanges(true);
  };

  const handleExcludeCorporate = () => {
    const norm = (s: string) => String(s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    
    setApreRecords((prev) =>
      prev.map((r) => {
        const sucursal = norm(r.sucursal);
        const centro = norm(r.centroCosto);
        if (sucursal !== 'TALCA' || (centro !== '' && !centro.includes('INFORMATICA'))) {
          return { ...r, excluded: true, exclusionReason: 'Centro costo no TIC (SEDE CORPORATIVA)' };
        }
        return r;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleExcludePersonnel = () => {
    setApreRecords((prev) =>
      prev.map((r) => {
        const s = suggestExclusion(r);
        if (s.reason?.includes('Gastos en personal')) {
          return { ...r, excluded: true, exclusionReason: s.reason };
        }
        return r;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleExcludeZeroAmount = () => {
    setApreRecords((prev) =>
      prev.map((r) => {
        const s = suggestExclusion(r);
        if (s.reason === 'Monto aprobado $0' || r.montoTotal <= 0) {
          return {
            ...r,
            excluded: true,
            exclusionReason: 'Monto aprobado $0',
          };
        }
        return r;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleRestoreSuggestions = () => {
    setApreRecords((prev) =>
      prev.map((r) => {
        const s = suggestExclusion(r);
        return {
          ...r,
          excluded: s.excluded,
          exclusionReason: s.reason || undefined,
        };
      })
    );
    setHasUnsavedChanges(false);
  };

  const handleConfirmImport = async () => {
    setIsSaving(true);
    try {
      let extraMsg = '';
      if (isSupabaseConfigured()) {
        const ok = await saveApreRecordsToDatabase(apreRecords);
        if (ok) {
          extraMsg = ' y sincronizados con Supabase';
        } else {
          console.error('Error al sincronizar registros APRE con Supabase PostgreSQL.');
          alert('Advertencia: Falló la sincronización con la base de datos Supabase en la nube. Revisa la consola para más detalles.');
        }
      }
      setImportNotification(
        `✅ Importación confirmada: ${includedCount} filas incluidas, ${excludedCount} excluidas${extraMsg}.`
      );
      setHasUnsavedChanges(false);
      setTimeout(() => setImportNotification(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRecord = (target: ApreApprovedRecord) => {
    setApreRecords((prev) =>
      prev.map((r) => {
        if (r.codigoPres === target.codigoPres && r.detalle === target.detalle) {
          if (r.excluded) {
            return {
              ...r,
              excluded: false,
              exclusionReason: undefined,
            };
          } else {
            return {
              ...r,
              excluded: true,
              exclusionReason: 'Exclusión manual de Paola',
            };
          }
        }
        return r;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Handle file import from APRE (.xlsx, .xls, .csv, .txt)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processCSVContent = async (content: string) => {
      setIsParsingFile(false);
      const parsed = parseApreApprovedCSV(content).map((r) => ({
        ...r,
        ano: r.ano || currentFiscalYear,
      }));
      if (parsed.length === 0) {
        alert('No se pudieron reconocer filas válidas en el archivo de APRE.');
        setImportNotification(null);
        return;
      }

      setApreRecords(parsed);
      setOriginalSuggestions(initSuggestions(parsed));
      setHasUnsavedChanges(false);

      let extraMsg = '';
      if (isSupabaseConfigured()) {
        const ok = await saveApreRecordsToDatabase(parsed);
        if (ok) {
          extraMsg = ' y guardados en Supabase PostgreSQL.';
        }
      }

      const inc = parsed.filter((r) => !r.excluded).length;
      const exc = parsed.filter((r) => r.excluded).length;
      setImportNotification(
        `¡Importación exitosa! Se cargaron ${parsed.length} registros (${inc} incluidos, ${exc} sugeridos para exclusión)${extraMsg}`
      );
      setTimeout(() => setImportNotification(null), 5000);
    };

    const fileNameLower = file.name.toLowerCase();
    if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
      setIsParsingFile(true);
      setImportNotification('⏳ Leyendo archivo Excel...');
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csvString = XLSX.utils.sheet_to_csv(firstSheet);
          await processCSVContent(csvString);
        } catch (err) {
          console.error('Error procesando archivo Excel:', err);
          setIsParsingFile(false);
          alert('Hubo un error al procesar el archivo Excel. Verifique el formato.');
          setImportNotification(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setIsParsingFile(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (!content) {
          setIsParsingFile(false);
          return;
        }
        await processCSVContent(content);
      };
      reader.readAsText(file, 'UTF-8');
    }

    // reset input
    e.target.value = '';
  };

  // Restore Real 2026 Sede Talca APRE dataset
  const handleRestoreRealDataset = async () => {
    const records = REAL_APRE_APPROVED_TALCA_2026.map((r) => {
      const s = suggestExclusion(r);
      return {
        ...r,
        excluded: s.excluded,
        exclusionReason: s.reason || undefined,
      };
    });
    setApreRecords(records);
    setOriginalSuggestions(initSuggestions(records));
    setHasUnsavedChanges(false);

    if (isSupabaseConfigured()) {
      await saveApreRecordsToDatabase(records);
    }

    setImportNotification(`Se ha recargado el conjunto oficial real aprobado por APRE ${currentFiscalYear} (Sede Talca) y sincronizado con Supabase.`);
    setTimeout(() => setImportNotification(null), 4000);
  };

  // Sync APRE figures into local project models
  const handleSyncProjectsWithAPRE = () => {
    let matchedCount = 0;

    projects.forEach((proj) => {
      // Try to find matching APRE records by keywords in title or area among active (included) records
      const matchingApre = activeRecords.filter((rec) => {
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
          approvedCeilingCLP: totalApreMatched > 0 ? totalApreMatched : proj.requestedBudgetCLP,
          executedBudgetCLP: totalEjecutadoMatched,
          reviewStatus: totalApreMatched > 0 ? 'Aprobado' : 'Ajuste Solicitado',
        });
      }
    });

    setImportNotification(
      `Sincronización completada: Se asociaron ${matchedCount} proyectos locales con los techos y códigos PRES aprobados en APRE.`
    );
    setTimeout(() => setImportNotification(null), 5000);
  };

  // Copy APRE table to clipboard (included rows)
  const handleCopyClipboard = () => {
    const textRows = activeRecords.map(
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
      {/* Hidden file input for importing APRE (.xlsx, .xls, .csv, .txt) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.txt,.xlsx,.xls"
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
              Importación y auditoría del archivo de presupuesto aprobado devuelto por la plataforma corporativa <strong>APRE</strong> para el ejercicio {currentFiscalYear}. Contrasta montos aprobados, códigos de presupuesto (CÓDIGO PRES) y saldos disponibles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* 1. Import CSV Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-[#ff6900] hover:bg-[#e05c00] text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-sm cursor-pointer"
              title="Importar archivo CSV o planilla Excel emitido por la plataforma APRE corporativa"
            >
              <Upload className="w-4 h-4" />
              <span>Importar CSV de APRE</span>
            </button>

            {/* 2. Confirm Import Button */}
            <button
              type="button"
              disabled={includedCount === 0 || isSaving}
              onClick={handleConfirmImport}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer ${
                includedCount === 0 || isSaving
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 ring-2 ring-emerald-400/30'
              }`}
              title={
                includedCount === 0
                  ? 'No hay filas incluidas'
                  : 'Confirmar y persistir la selección oficial'
              }
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Guardando...' : 'Confirmar importación'}</span>
            </button>

            {/* 3. Next Stage Button */}
            <button
              onClick={onGoToNextStage}
              className="flex items-center gap-2 bg-[#da291c] hover:bg-[#b81e13] text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors text-sm cursor-pointer ring-1 ring-white/20"
            >
              <span>Avanzar a Readecuación</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Large Strategic Metric Cards derived from APRE (D5: solo suman incluidas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Aprobado APRE {currentFiscalYear}</p>
              {totalMontoExcluido > 0 && (
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                  − {formatCLP(totalMontoExcluido)} excluidos
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900 font-tabular mt-1">
              {formatCLP(totalMontoApre)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ({activeRecords.length} filas incluidas de {apreRecords.length} totales)
            </p>
          </div>

          <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-blue-900 uppercase">Inversión (Activos / CAPEX)</p>
              {inversionExcluida > 0 && (
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                  − {formatCLP(inversionExcluida)} excluidos
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-blue-900 font-tabular mt-1">
              {formatCLP(totalActivosInversion)}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              ({activeRecords.filter((r) => r.tipoCuenta === 'ACTIVOS' || r.grupoCuenta === 'INVERSIÓN').length} filas incluidas de {apreRecords.filter((r) => r.tipoCuenta === 'ACTIVOS' || r.grupoCuenta === 'INVERSIÓN').length} totales)
            </p>
          </div>

          <div className="p-4 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-emerald-900 uppercase">Gastos de Operación (OPEX)</p>
              {gastosExcluidos > 0 && (
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                  − {formatCLP(gastosExcluidos)} excluidos
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-emerald-900 font-tabular mt-1">
              {formatCLP(totalGastosOperacion)}
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              ({activeRecords.filter((r) => r.tipoCuenta === 'GASTOS' && r.grupoCuenta !== 'GASTOS EN PERSONAL').length} filas incluidas de {apreRecords.filter((r) => r.tipoCuenta === 'GASTOS' && r.grupoCuenta !== 'GASTOS EN PERSONAL').length} totales)
            </p>
          </div>

          {/* Saldo Vigente en Amarillo como en la planilla real */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-amber-950 uppercase">Saldo Disponible Real</p>
              {saldoExcluido > 0 && (
                <span className="text-[10px] font-semibold text-slate-600 bg-amber-200/80 px-1.5 py-0.5 rounded">
                  − {formatCLP(saldoExcluido)} excluidos
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-amber-900 font-tabular mt-1">
              {formatCLP(totalSaldoApre)}
            </p>
            <p className="text-xs text-amber-800 mt-1">
              ({activeRecords.length} filas incluidas de {apreRecords.length} totales)
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
            <span className="text-[11px] text-blue-300 block">Aprobado APRE {currentFiscalYear}</span>
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

      {/* D3 & D7: Panel de Revisión Explícita y Control de Inclusiones por Paola */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm space-y-4">
        {/* D7 Banner Contextual */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
          <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <span>
            <strong>Revisión de Importación APRE:</strong> La app marcó automáticamente filas que no corresponden al presupuesto TIC de Sede Talca. Revísalas antes de confirmar la importación. Puedes incluir o excluir cualquier fila manualmente.
          </span>
        </div>

        {/* Resumen numérico */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
              <span>📊</span>
              <span>{includedCount} filas incluidas</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 font-medium">{excludedCount} filas excluidas</span>
              <span className="text-slate-400 text-xs">({apreRecords.length} en archivo)</span>
            </div>
            <div className="text-sm text-slate-700 flex flex-wrap items-center gap-2 font-tabular">
              <span>💰</span>
              <span>Total incluido: <strong className="text-emerald-700">{formatCLP(totalMontoApre)}</strong></span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">Total excluido: <strong className="text-slate-500">{formatCLP(totalMontoExcluido)}</strong></span>
            </div>
          </div>

          {hasUnsavedChanges && (
            <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-md self-start md:self-auto flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>Hay cambios de inclusión pendientes de confirmar</span>
            </span>
          )}
        </div>

        {/* Barra de botones de acción rápida */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleIncludeAll}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-bold transition-colors cursor-pointer border border-slate-300"
          >
            Incluir todo
          </button>

          <button
            type="button"
            onClick={handleExcludeCorporate}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer border border-slate-300"
          >
            Excluir SEDE CORPORATIVA
          </button>

          <button
            type="button"
            onClick={handleExcludePersonnel}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer border border-slate-300"
          >
            Excluir Gastos en Personal
          </button>

          <button
            type="button"
            onClick={handleExcludeZeroAmount}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer border border-slate-300"
          >
            Excluir Monto $0
          </button>

          <button
            type="button"
            onClick={handleRestoreSuggestions}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer border border-slate-300 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Restaurar sugerencias</span>
          </button>
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
              Activos / Inversión ({apreRecords.filter((r) => r.tipoCuenta === 'ACTIVOS' || r.grupoCuenta === 'INVERSIÓN').length})
            </button>
            <button
              onClick={() => setFilterType('GASTOS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'GASTOS'
                  ? 'bg-emerald-100 text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gastos de Operación ({apreRecords.filter((r) => r.tipoCuenta === 'GASTOS' && r.grupoCuenta !== 'GASTOS EN PERSONAL').length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md"
            title="Copiar tabla de filas activas al portapapeles"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar Activas'}</span>
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
              Presupuesto Aprobado APRE {currentFiscalYear} · Sede Talca (Centro Costo 621007 - INFORMÁTICA)
            </h3>
            <p className="text-xs text-slate-500">
              Datos oficiales vigentes con codificación de la Dirección de Gestión y Administración Financiera (DGAF).
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-900 bg-blue-100 px-2.5 py-1 rounded">
            {filteredRecords.length} registros en vista ({filteredRecords.filter((r) => !r.excluded).length} incluidos)
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Aún no se ha importado el archivo de aprobación APRE para el ejercicio {currentFiscalYear}
            </h3>
            <p className="text-base text-slate-600 mb-6 max-w-lg mx-auto leading-relaxed">
              {currentFiscalYear === 2027
                ? 'El ejercicio 2027 se encuentra en fase de formulación. Exporte el CSV en la Etapa 2 para enviarlo a Dirección. Una vez recibida la aprobación corporativa, presione el botón "Importar CSV de APRE" superior para cargar los saldos oficiales.'
                : `No se registran líneas contables de APRE para el ejercicio ${currentFiscalYear}.`}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-[#da291c] hover:bg-[#b81e13] text-white font-bold px-5 py-2.5 rounded-lg text-sm cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Archivo APRE {currentFiscalYear}</span>
            </button>
          </div>
        ) : (
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
                  <th className="py-3 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                {filteredRecords.map((rec, index) => {
                  const isExcluded = Boolean(rec.excluded);

                  return (
                    <tr
                      key={`${rec.codigoPres}-${index}`}
                      className={`transition-colors ${
                        isExcluded
                          ? 'bg-slate-100 text-slate-400 hover:bg-slate-200/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {rec.distribucion}
                      </td>

                      <td className={`py-2.5 px-3 whitespace-nowrap font-mono font-bold ${isExcluded ? 'text-slate-400' : 'text-slate-900'}`}>
                        {rec.codigoPres}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isExcluded
                              ? 'bg-slate-200 text-slate-500'
                              : rec.tipoCuenta === 'ACTIVOS' || rec.grupoCuenta === 'INVERSIÓN'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {rec.tipoCuenta === 'ACTIVOS' ? 'INVERSIÓN' : 'GASTO OPEX'}
                        </span>
                      </td>

                      <td className={`py-2.5 px-3 whitespace-nowrap font-medium ${isExcluded ? 'text-slate-400' : 'text-slate-900'}`}>
                        <span className="font-mono text-slate-500 mr-1">{rec.codigoCuenta}</span>
                        <span>{rec.cuentaContable}</span>
                      </td>

                      <td className={`py-2.5 px-3 max-w-[240px] truncate ${isExcluded ? 'text-slate-400' : 'font-semibold text-slate-900'}`} title={rec.detalle}>
                        {rec.detalle}
                      </td>

                      <td className="py-2.5 px-3 max-w-[240px] truncate text-slate-500" title={rec.justificacion}>
                        {rec.justificacion}
                      </td>

                      <td className={`py-2.5 px-3 text-right font-tabular whitespace-nowrap ${isExcluded ? 'line-through text-slate-400' : 'font-bold text-slate-900'}`}>
                        {formatCLP(rec.montoTotal)}
                      </td>

                      <td className={`py-2.5 px-3 text-right font-tabular whitespace-nowrap ${isExcluded ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                        {rec.montoEjecutado > 0 ? formatCLP(rec.montoEjecutado) : '$ 0'}
                      </td>

                      {/* Saldo column */}
                      <td className={`py-2.5 px-3 text-right font-tabular whitespace-nowrap border-x ${
                        isExcluded
                          ? 'line-through text-slate-400 bg-slate-100/80 border-slate-200'
                          : 'font-bold text-amber-950 bg-amber-50/80 border-amber-200'
                      }`}>
                        {formatCLP(rec.saldo)}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap text-[10px] text-slate-500 font-mono">
                        {rec.usuarioCre?.split(' ')[0] || 'EDISON'}
                      </td>

                      {/* D4: Columna Estado con Badge y Botón Toggle */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {isExcluded ? (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
                                ⊘ No incluida
                              </span>
                              {rec.exclusionReason && (
                                <span
                                  className="text-[10px] text-slate-500 max-w-[160px] truncate leading-tight font-normal"
                                  title={rec.exclusionReason}
                                >
                                  {rec.exclusionReason}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleRecord(rec)}
                                className="mt-0.5 px-2.5 py-0.5 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                Incluir
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ Incluida
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleRecord(rec)}
                                className="mt-0.5 px-2.5 py-0.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-300 hover:border-rose-300 rounded text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                              >
                                Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* D6: Footer que totaliza SOLO incluidas + fila de total excluido */}
              {(() => {
                const includedFiltered = filteredRecords.filter((r) => !r.excluded);
                const excludedFiltered = filteredRecords.filter((r) => r.excluded);

                const sumIncludedMonto = includedFiltered.reduce((sum, r) => sum + r.montoTotal, 0);
                const sumIncludedEjec = includedFiltered.reduce((sum, r) => sum + r.montoEjecutado, 0);
                const sumIncludedSaldo = includedFiltered.reduce((sum, r) => sum + r.saldo, 0);

                const sumExcludedMonto = excludedFiltered.reduce((sum, r) => sum + r.montoTotal, 0);
                const sumExcludedEjec = excludedFiltered.reduce((sum, r) => sum + r.montoEjecutado, 0);
                const sumExcludedSaldo = excludedFiltered.reduce((sum, r) => sum + r.saldo, 0);

                return (
                  <tfoot className="border-t-2 border-slate-300 text-xs">
                    {/* Fila 1: Total Incluido en el Presupuesto */}
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <td colSpan={6} className="py-3 px-3 text-right text-sm">
                        Total Consolidado Aprobado por APRE (Sede Talca · {includedFiltered.length} filas incluidas):
                      </td>
                      <td className="py-3 px-3 text-right font-tabular text-sm text-slate-900">
                        {formatCLP(sumIncludedMonto)}
                      </td>
                      <td className="py-3 px-3 text-right font-tabular text-sm text-slate-600">
                        {formatCLP(sumIncludedEjec)}
                      </td>
                      <td className="py-3 px-3 text-right font-tabular text-sm text-amber-950 bg-amber-100/80 border-x border-amber-300">
                        {formatCLP(sumIncludedSaldo)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>

                    {/* Fila 2: Total Excluido */}
                    {excludedFiltered.length > 0 && (
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-t border-slate-200">
                        <td colSpan={6} className="py-2.5 px-3 text-right">
                          Total excluido (no incluido en el presupuesto · {excludedFiltered.length} filas excluidas):
                        </td>
                        <td className="py-2.5 px-3 text-right font-tabular line-through text-slate-400">
                          {formatCLP(sumExcludedMonto)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-tabular line-through text-slate-400">
                          {formatCLP(sumExcludedEjec)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-tabular line-through text-slate-400 bg-slate-100 border-x border-slate-200">
                          {formatCLP(sumExcludedSaldo)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                  </tfoot>
                );
              })()}
            </table>
          </div>
        )}
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
