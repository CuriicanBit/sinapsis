import React, { useState, useEffect, useCallback } from 'react';
import { Project, Role, StageId } from './types/budget';
import { INITIAL_PROJECTS } from './data/mockData';
import { Header } from './components/Header';
import { Stage1Formulacion } from './components/Stage1Formulacion';
import { Stage2AsignacionContable } from './components/Stage2AsignacionContable';
import { Stage3ApreExport } from './components/Stage3ApreExport';
import { Stage4GimnasiaMonetaria } from './components/Stage4GimnasiaMonetaria';
import { Stage5EjecucionControl } from './components/Stage5EjecucionControl';
import { DashboardGerencial } from './components/DashboardGerencial';
import { SupabaseConnectionModal } from './components/SupabaseConnectionModal';
import { isSupabaseConfigured } from './lib/supabase';
import { 
  fetchProjectsFromDatabase, 
  insertProjectIntoDatabase, 
  updateProjectInDatabase, 
  deleteProjectFromDatabase 
} from './services/supabaseService';
import { CatalogProvider, useCatalog } from './CatalogContext';
import { updateOfficialAccounts } from './utils/formatters';
import { updateOfficialAreas, updateOfficialTechnicians } from './types/budget';
import { CalendarRange, Sparkles, History, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'sinapsis_tic_talca_v4';

// Helper: strictly extract project fiscal year
export function getProjectFiscalYear(p: Project): number {
  if (p.fiscalYear !== undefined && p.fiscalYear !== null) {
    const num = Number(p.fiscalYear);
    if (!isNaN(num) && num > 0) return num;
  }
  if (p.code && typeof p.code === 'string') {
    const match = p.code.match(/TIC-TAL-(\d{4})/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  return 2026;
}

function AppContent() {
  const { cuentas, areas, tecnicos, isLoading } = useCatalog();
  const [, setCatalogsReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      updateOfficialAccounts(cuentas);
      updateOfficialAreas(areas);
      updateOfficialTechnicians(tecnicos);
      setCatalogsReady(true);
    }
  }, [isLoading, cuentas, areas, tecnicos]);

  const [currentRole, setCurrentRole] = useState<Role>('coordinador');
  const [currentFiscalYear, setCurrentFiscalYear] = useState<number>(2026);
  const [currentStage, setCurrentStage] = useState<StageId>('readecuacion');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => isSupabaseConfigured());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading stored budget data:', e);
    }
    return INITIAL_PROJECTS;
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Sync to localStorage as fast client fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('Error saving budget data to local storage:', e);
    }
  }, [projects]);

  // Load from Supabase on mount or credential updates
  const loadDataFromSupabase = useCallback(async () => {
    const configured = isSupabaseConfigured();
    setIsSupabaseConnected(configured);

    if (configured) {
      setIsSyncing(true);
      try {
        const dbProjects = await fetchProjectsFromDatabase();
        if (dbProjects && dbProjects.length > 0) {
          setProjects(dbProjects);
          showNotification('🟢 Proyectos sincronizados en vivo desde PostgreSQL de Supabase.');
        }
      } catch (err) {
        console.warn('Could not hydrate projects from Supabase:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDataFromSupabase();
  }, [loadDataFromSupabase]);

  // Budget Cycle Context Switcher Handler
  const handleFiscalYearChange = (newYear: number) => {
    setCurrentFiscalYear(newYear);

    if (newYear === 2026) {
      // 2026 Execution: Focus on Stage 4 (Bolsa & Readecuación) and Stage 5 (Ejecución)
      if (currentStage === 'formulacion') {
        setCurrentStage('readecuacion');
      }
      showNotification('⚡ Contexto activado: EJECUCIÓN 2026 en curso (Bolsa de Proyectos y Control de Avance).');
    } else if (newYear === 2027) {
      // 2027 Planning: Focus on Stage 1 (Formulación Técnica), Stage 2 (Asignación Contable) and Stage 3 (APRE)
      if (currentStage === 'readecuacion' || currentStage === 'gimnasia' || currentStage === 'ejecucion') {
        setCurrentStage('formulacion');
      }
      showNotification('📝 Contexto activado: PLANIFICACIÓN 2027 (Formulación técnica con cierre en Septiembre).');
    } else {
      showNotification(`🏛️ Contexto activado: Consulta de Archivo Histórico ${newYear} (Solo lectura).`);
    }
  };

  // Filter projects strictly by current fiscal year using robust helper
  const visibleProjects = projects.filter(
    (p) => getProjectFiscalYear(p) === currentFiscalYear
  );

  // Project CRUD handlers with real Supabase persistence & year tagging
  const handleAddProject = async (newProject: Project) => {
    const projectWithYear: Project = {
      ...newProject,
      fiscalYear: currentFiscalYear,
    };

    setProjects((prev) => [projectWithYear, ...prev]);
    showNotification(`Proyecto ${projectWithYear.code} formulado para el ejercicio ${currentFiscalYear}.`);

    if (isSupabaseConfigured()) {
      const ok = await insertProjectIntoDatabase(projectWithYear);
      if (ok) {
        showNotification(`Proyecto ${projectWithYear.code} guardado en Supabase (INSERT).`);
      }
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === updatedProject.id);
      if (!exists) {
        return [
          {
            ...updatedProject,
            fiscalYear: updatedProject.fiscalYear || currentFiscalYear,
          },
          ...prev,
        ];
      }
      return prev.map((p) =>
        p.id === updatedProject.id
          ? {
              ...p,
              ...updatedProject,
              fiscalYear: updatedProject.fiscalYear || p.fiscalYear || currentFiscalYear,
            }
          : p
      );
    });

    if (isSupabaseConfigured()) {
      const exists = projects.some((p) => p.id === updatedProject.id);
      if (!exists) {
        await insertProjectIntoDatabase(updatedProject);
      } else {
        await updateProjectInDatabase(updatedProject);
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    showNotification('Proyecto eliminado.');

    if (isSupabaseConfigured()) {
      const ok = await deleteProjectFromDatabase(projectId);
      if (ok) {
        showNotification('Proyecto eliminado de Supabase (DELETE).');
      }
    }
  };

  const handleResetData = () => {
    if (confirm('¿Desea restablecer todos los proyectos al conjunto inicial de datos de Sede Talca (2026, 2027 y 2025)?')) {
      setProjects(INITIAL_PROJECTS);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // ignore
      }
      showNotification('Datos institucionales multianuales restablecidos.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-xl">
        Cargando catálogos desde Supabase...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col selection:bg-blue-200">
      {/* Navigation Header with Fiscal Year & Role Switchers */}
      <Header
        currentRole={currentRole}
        onRoleChange={(role) => {
          setCurrentRole(role);
          showNotification(`Cambiado al perfil: ${role.toUpperCase()}`);
        }}
        currentStage={currentStage}
        onStageChange={(stage) => setCurrentStage(stage)}
        currentFiscalYear={currentFiscalYear}
        onFiscalYearChange={handleFiscalYearChange}
        onResetData={handleResetData}
        isSupabaseActive={isSupabaseConnected}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Discrete Notification Banner: Future Planning 2027 */}
      {currentFiscalYear === 2027 && (
        <aside aria-label="Aviso de Modo Planificación" className="w-full bg-[#111111] text-white border-b-2 border-[#ff6900] px-4 sm:px-6 lg:px-8 py-3 shadow-md animate-fade-in">
          <div className="max-w-[1560px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#ff6900] text-black font-extrabold text-xs rounded-lg shadow-sm shrink-0">
                📝 CICLO 2027
              </span>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Trabajando en Planificación Presupuestaria 2027</span>
                  <span className="text-[11px] font-semibold bg-[#ff6900]/20 text-[#ff6900] px-2 py-0.5 rounded border border-[#ff6900]/30">
                    Formulación en Curso
                  </span>
                </h2>
                <p className="text-xs text-[#d2d2d2] mt-0.5">
                  Estás formulando el anteproyecto de inversión y gasto TIC. Control de plazo de cierre de Paola en <strong>Septiembre 2026</strong>. Todo proyecto creado se identificará como <strong className="text-white font-mono">TIC-TAL-2027-XXX</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleFiscalYearChange(2026)}
              className="px-3 py-1.5 bg-[#da291c] hover:bg-[#b81e13] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Cambiar al ciclo presupuestario en ejecución activa 2026"
            >
              <span>Volver a Ejecución 2026 ⚡</span>
            </button>
          </div>
        </aside>
      )}

      {/* Discrete Notification Banner: Historical Years */}
      {currentFiscalYear <= 2025 && (
        <aside aria-label="Aviso de Modo Histórico" className="w-full bg-slate-900 text-white border-b-2 border-amber-500 px-4 sm:px-6 lg:px-8 py-3 shadow-md animate-fade-in">
          <div className="max-w-[1560px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-500 text-black font-extrabold text-xs rounded-lg shadow-sm shrink-0">
                🏛️ ARCHIVO {currentFiscalYear}
              </span>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Consulta Histórica: Ejercicio Presupuestario {currentFiscalYear}</span>
                  <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                    Cerrado y Archivado
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Registro histórico de proyectos ejecutados y aprobaciones pasadas para fines de auditoría institucional, comparativas interanuales y trazabilidad técnica.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleFiscalYearChange(2026)}
              className="px-3 py-1.5 bg-[#da291c] hover:bg-[#b81e13] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Volver al ejercicio activo en curso 2026"
            >
              <span>Ir a Ejecución Activa 2026 ⚡</span>
            </button>
          </div>
        </aside>
      )}

      {/* Supabase Connection Modal */}
      <SupabaseConnectionModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onCredentialsUpdated={() => {
          loadDataFromSupabase();
        }}
      />

      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#000000] text-white text-sm font-bold px-4 py-3 rounded-xl shadow-2xl border-2 border-[#da291c] animate-fade-in flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6900]" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Container - Full Width Layout with Active Year Scoped Projects */}
      <main className="flex-1 w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentStage === 'formulacion' && (
          <Stage1Formulacion
            projects={visibleProjects}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            currentRole={currentRole}
            currentFiscalYear={currentFiscalYear}
          />
        )}

        {currentStage === 'contable' && (
          <Stage2AsignacionContable
            projects={visibleProjects}
            onUpdateProject={handleUpdateProject}
            currentRole={currentRole}
            onGoToNextStage={() => setCurrentStage('apre')}
            currentFiscalYear={currentFiscalYear}
          />
        )}

        {currentStage === 'apre' && (
          <Stage3ApreExport
            projects={visibleProjects}
            onUpdateProject={handleUpdateProject}
            currentRole={currentRole}
            onGoToNextStage={() => setCurrentStage('readecuacion')}
            currentFiscalYear={currentFiscalYear}
          />
        )}

        {(currentStage === 'readecuacion' || currentStage === 'gimnasia') && (
          <Stage4GimnasiaMonetaria
            projects={visibleProjects}
            onUpdateProject={handleUpdateProject}
            onAddProject={handleAddProject}
            currentRole={currentRole}
            onGoToNextStage={() => setCurrentStage('ejecucion')}
            currentFiscalYear={currentFiscalYear}
          />
        )}

        {currentStage === 'ejecucion' && (
          <Stage5EjecucionControl
            projects={visibleProjects}
            onUpdateProject={handleUpdateProject}
            onAddProject={handleAddProject}
            currentRole={currentRole}
            currentFiscalYear={currentFiscalYear}
          />
        )}

        {currentStage === 'gerencial' && (
          <DashboardGerencial
            projects={visibleProjects}
            currentRole={currentRole}
            onNavigateToStage={(stage) => setCurrentStage(stage)}
            currentFiscalYear={currentFiscalYear}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-[#000000] text-[#d2d2d2] border-t-2 border-[#da291c] text-xs py-4 px-6 mt-12 no-print">
        <div className="max-w-[1560px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">SINAPSIS TIC · Sede Talca</span>
            <span>·</span>
            <span>Universidad Autónoma de Chile</span>
            <span>·</span>
            <span className="text-[#ff6900] font-semibold">Dirección TIC</span>
          </div>
          <div className="flex items-center gap-4 text-[#d2d2d2]">
            <span>Sistema Institucional de Gestión Presupuestaria y Flujo APRE</span>
            <span>·</span>
            <span className="font-mono text-white font-bold bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#333333]">
              Ejercicio {currentFiscalYear}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <CatalogProvider>
      <AppContent />
    </CatalogProvider>
  );
}
