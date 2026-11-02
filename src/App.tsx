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

const STORAGE_KEY = 'ua_talca_tic_budget_2026_v1';

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>('coordinador');
  const [currentStage, setCurrentStage] = useState<StageId>('formulacion');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => isSupabaseConfigured());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
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
    }, 4000);
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

  // Project CRUD handlers with real Supabase persistence
  const handleAddProject = async (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    showNotification(`Proyecto ${newProject.code} formulado exitosamente.`);

    if (isSupabaseConfigured()) {
      const ok = await insertProjectIntoDatabase(newProject);
      if (ok) {
        showNotification(`Proyecto ${newProject.code} guardado en Supabase (INSERT).`);
      }
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );

    if (isSupabaseConfigured()) {
      await updateProjectInDatabase(updatedProject);
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
    if (confirm('¿Desea restablecer todos los proyectos al conjunto inicial de datos de Sede Talca?')) {
      setProjects(INITIAL_PROJECTS);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // ignore
      }
      showNotification('Datos institucionales restablecidos.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col selection:bg-blue-200">
      {/* Navigation Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={(role) => {
          setCurrentRole(role);
          showNotification(`Cambiado al perfil: ${role.toUpperCase()}`);
        }}
        currentStage={currentStage}
        onStageChange={(stage) => setCurrentStage(stage)}
        onResetData={handleResetData}
        isSupabaseActive={isSupabaseConnected}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

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

      {/* Main Container - Full Width Layout without cramped margins */}
      <main className="flex-1 w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentStage === 'formulacion' && (
          <Stage1Formulacion
            projects={projects}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            currentRole={currentRole}
          />
        )}

        {currentStage === 'contable' && (
          <Stage2AsignacionContable
            projects={projects}
            onUpdateProject={handleUpdateProject}
            currentRole={currentRole}
            onGoToNextStage={() => setCurrentStage('apre')}
          />
        )}

        {currentStage === 'apre' && (
          <Stage3ApreExport
            projects={projects}
            onUpdateProject={handleUpdateProject}
            currentRole={currentRole}
            onGoToNextStage={() => setCurrentStage('readecuacion')}
          />
        )}

        {(currentStage === 'readecuacion' || currentStage === 'gimnasia') && (
          <Stage4GimnasiaMonetaria
            projects={projects}
            onUpdateProject={handleUpdateProject}
            currentRole={currentRole}
            onGoToNextStage={() => setCurrentStage('ejecucion')}
          />
        )}

        {currentStage === 'ejecucion' && (
          <Stage5EjecucionControl
            projects={projects}
            onUpdateProject={handleUpdateProject}
            onAddProject={handleAddProject}
            currentRole={currentRole}
          />
        )}

        {currentStage === 'gerencial' && (
          <DashboardGerencial
            projects={projects}
            currentRole={currentRole}
            onNavigateToStage={(stage) => setCurrentStage(stage)}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-[#000000] text-[#d2d2d2] border-t-2 border-[#da291c] text-xs py-4 px-6 mt-12 no-print">
        <div className="max-w-[1560px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Universidad Autónoma de Chile</span>
            <span>·</span>
            <span>Dirección de Tecnologías de Información y Comunicación (TIC)</span>
            <span>·</span>
            <span className="text-[#ff6900] font-semibold">Sede Talca</span>
          </div>
          <div className="flex items-center gap-4 text-[#d2d2d2]">
            <span>Sistema Institucional de Gestión Presupuestaria y Flujo APRE</span>
            <span>·</span>
            <span className="font-mono text-white font-bold">Año 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
