import React from 'react';
import { Role, StageId } from '../types/budget';
import { 
  FileEdit, 
  BookOpenCheck, 
  Send, 
  Scale, 
  Activity, 
  BarChart3, 
  RotateCcw,
  UserCheck,
  Database,
  CalendarRange
} from 'lucide-react';

interface HeaderProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  currentStage: StageId;
  onStageChange: (stage: StageId) => void;
  currentFiscalYear: number;
  onFiscalYearChange: (year: number) => void;
  onResetData: () => void;
  isSupabaseActive?: boolean;
  onOpenSupabaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  currentStage,
  onStageChange,
  currentFiscalYear,
  onFiscalYearChange,
  onResetData,
  isSupabaseActive = false,
  onOpenSupabaseModal,
}) => {
  const stages: { id: StageId; label: string; icon: React.ReactNode }[] = [
    { id: 'formulacion', label: '1. Formulación', icon: <FileEdit className="w-4 h-4" /> },
    { id: 'contable', label: '2. Asignación Contable', icon: <BookOpenCheck className="w-4 h-4" /> },
    { id: 'apre', label: '3. Aprobación APRE', icon: <Send className="w-4 h-4" /> },
    { id: 'readecuacion', label: '4. Bolsa & Readecuación', icon: <Scale className="w-4 h-4" /> },
    { id: 'ejecucion', label: '5. Ejecución Técnica', icon: <Activity className="w-4 h-4" /> },
    { id: 'gerencial', label: 'Visión Gerencial', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const roleLabels: Record<Role, { title: string; subtitle: string }> = {
    tecnico: { title: 'Técnico', subtitle: 'Formulación de Proyectos y Avance' },
    coordinador: { title: 'Coordinadora - Paola', subtitle: 'Plazos, Cuentas Contables y APRE' },
    director: { title: 'Director', subtitle: 'Aprobaciones y Ajustes Institucionales' },
  };

  return (
    <header className="bg-[#000000] text-white border-b-2 border-[#da291c] sticky top-0 z-30 shadow-lg">
      {/* Top Banner: Institutional Identity & Global Role Switcher */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-[#222222]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#da291c] text-white flex items-center justify-center font-extrabold text-lg tracking-wider shadow-md shrink-0 ring-1 ring-white/20">
            UA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                SINAPSIS TIC <span className="text-[#ff6900]">·</span> Sede Talca
              </h1>
              <span className="hidden md:inline-block text-[11px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                Sistema Inteligente de Negociación y Asignación Presupuestaria
              </span>
            </div>
            <p className="text-xs text-[#d2d2d2] font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>Universidad Autónoma de Chile</span>
              <span>·</span>
              {currentFiscalYear === 2026 && (
                <span className="text-[#da291c] font-bold bg-[#da291c]/10 px-1.5 py-0.5 rounded border border-[#da291c]/30">
                  ⚡ Ejercicio Activo 2026 (En Ejecución)
                </span>
              )}
              {currentFiscalYear === 2027 && (
                <span className="text-[#ff6900] font-bold bg-[#ff6900]/10 px-1.5 py-0.5 rounded border border-[#ff6900]/30">
                  📝 Planificación Futura 2027 (En Formulación)
                </span>
              )}
              {currentFiscalYear <= 2025 && (
                <span className="text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                  🏛️ Archivo Histórico {currentFiscalYear} (Cerrado)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Global Controls: Fiscal Year Switcher & Role Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. BARRA SUPERIOR DE CICLOS PRESUPUESTARIOS */}
          <div className="flex items-center bg-[#151515] p-1 rounded-lg border border-[#333333] shadow-inner">
            <span className="text-xs font-semibold text-[#d2d2d2] px-2.5 flex items-center gap-1.5 border-r border-[#333333] mr-1">
              <CalendarRange className="w-3.5 h-3.5 text-[#ff6900]" />
              <span className="hidden sm:inline">Ejercicio:</span>
            </span>

            {/* [ ⚡ EJECUCIÓN 2026 (Activo) ] */}
            <button
              type="button"
              onClick={() => onFiscalYearChange(2026)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                currentFiscalYear === 2026
                  ? 'bg-[#da291c] text-white shadow-md ring-1 ring-white/30 font-bold'
                  : 'text-[#d2d2d2] hover:text-white hover:bg-white/10'
              }`}
              title="Ejercicio 2026 en curso: Readecuación, Bolsa de proyectos y Ejecución técnica"
            >
              <span className="text-sm">⚡</span>
              <span>EJECUCIÓN 2026</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                currentFiscalYear === 2026 ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
              }`}>
                Activo
              </span>
            </button>

            {/* [ 📝 PLANIFICACIÓN 2027 (En Formulación) ] */}
            <button
              type="button"
              onClick={() => onFiscalYearChange(2027)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ml-1 ${
                currentFiscalYear === 2027
                  ? 'bg-[#ff6900] text-black shadow-md ring-1 ring-black/30 font-extrabold'
                  : 'text-[#d2d2d2] hover:text-white hover:bg-white/10'
              }`}
              title="Planificación 2027: Formulación técnica con plazo en Septiembre, Asignación Contable y APRE"
            >
              <span className="text-sm">📝</span>
              <span>PLANIFICACIÓN 2027</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                currentFiscalYear === 2027 ? 'bg-black/20 text-black' : 'bg-[#ff6900]/20 text-[#ff6900]'
              }`}>
                En Formulación
              </span>
            </button>

            {/* Historical Selector: 2025, 2024 */}
            <div className="relative border-l border-[#333333] ml-1 pl-1">
              <select
                aria-label="Ejercicios Históricos"
                value={currentFiscalYear <= 2025 ? currentFiscalYear : 'more'}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    onFiscalYearChange(val);
                  }
                }}
                className={`bg-transparent text-xs font-semibold px-2 py-1.5 rounded cursor-pointer outline-none transition-colors ${
                  currentFiscalYear <= 2025
                    ? 'bg-amber-600/30 text-amber-300 font-bold ring-1 ring-amber-400/40'
                    : 'text-[#d2d2d2] hover:text-white'
                }`}
              >
                <option value="more" disabled className="bg-[#1c1c1c] text-[#888888]">
                  🏛️ Históricos...
                </option>
                <option value="2025" className="bg-[#1c1c1c] text-white">
                  🏛️ Histórico 2025
                </option>
                <option value="2024" className="bg-[#1c1c1c] text-white">
                  🏛️ Histórico 2024
                </option>
              </select>
            </div>
          </div>

          {/* 2. Selector de Rol */}
          <div className="flex items-center bg-[#151515] p-1 rounded-lg border border-[#333333]">
            <span className="text-xs font-semibold text-[#d2d2d2] px-2.5 flex items-center gap-1.5 border-r border-[#333333] mr-1">
              <UserCheck className="w-3.5 h-3.5 text-[#ff6900]" />
              Rol:
            </span>
            {(['tecnico', 'coordinador', 'director'] as Role[]).map((role) => {
              const active = currentRole === role;
              return (
                <button
                  key={role}
                  onClick={() => onRoleChange(role)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#da291c] text-white shadow-md ring-1 ring-white/30 font-bold'
                      : 'text-[#d2d2d2] hover:text-white hover:bg-white/10'
                  }`}
                  title={roleLabels[role].subtitle}
                >
                  {role === 'tecnico' && 'Técnico'}
                  {role === 'coordinador' && 'Coordinadora - Paola'}
                  {role === 'director' && 'Director'}
                </button>
              );
            })}
          </div>

          {/* Supabase Connection Status Button */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              title={isSupabaseActive ? "Base de datos Supabase conectada en vivo" : "Configurar conexión a Supabase (PostgreSQL)"}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                isSupabaseActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50 hover:bg-emerald-900'
                  : 'bg-[#1c1c1c] text-[#d2d2d2] border-[#444444] hover:text-white hover:bg-[#282828]'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                {isSupabaseActive ? 'Supabase Conectado' : 'Conectar Supabase'}
              </span>
            </button>
          )}

          <button
            onClick={onResetData}
            title="Restablecer datos de prueba institucionales de Sede Talca"
            className="p-2 text-[#d2d2d2] hover:text-white hover:bg-white/10 rounded-lg border border-[#333333] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stage Navigation Bar with Sequential Flow Indicator */}
      <nav aria-label="Etapas de Flujo Presupuestario" className="w-full px-4 sm:px-6 lg:px-8 bg-[#111111] overflow-x-auto">
        <div className="flex items-center gap-2 py-2 min-w-max">
          {stages.map((stage, idx) => {
            const isActive = 
              currentStage === stage.id || 
              (stage.id === 'readecuacion' && currentStage === 'gimnasia');
            const isGerencial = stage.id === 'gerencial';

            return (
              <React.Fragment key={stage.id}>
                {idx > 0 && (
                  <span className="text-[#555555] text-xs font-bold px-1 select-none">
                    →
                  </span>
                )}
                <button
                  onClick={() => onStageChange(stage.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? isGerencial 
                        ? 'bg-[#ff6900] text-black shadow-md font-bold'
                        : 'bg-[#da291c] text-white shadow-md font-bold ring-1 ring-white/20'
                      : isGerencial
                        ? 'text-[#ff6900] hover:text-white hover:bg-white/5 border border-[#ff6900]/40'
                        : 'text-[#d2d2d2] hover:text-white hover:bg-white/10'
                  }`}
                >
                  {stage.icon}
                  <span>{stage.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
