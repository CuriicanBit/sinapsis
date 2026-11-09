import React, { useState, useEffect, useMemo } from 'react';
import { Project, Role, ExecutionStatus, BitacoraEntry, Area, BudgetItem, ProjectMilestone } from '../types/budget';
import { formatCLP, MONTH_NAMES } from '../utils/formatters';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  FileText, 
  Search,
  Activity,
  History,
  X,
  Calendar,
  FolderTree,
  Paperclip,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react';
import { fetchHitosForProject, insertHito, updateHito, deleteHito } from '../services/supabaseService';

interface MarianelaStepperProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
}

const MarianelaStepper: React.FC<MarianelaStepperProps> = ({ project, onUpdateProject }) => {
  const [eett, setEett] = useState(project.especificacionesTecnicas || '');
  const [proveedor, setProveedor] = useState(project.proveedorAdjudicado || '');
  const [savedEett, setSavedEett] = useState(false);
  const [savedProv, setSavedProv] = useState(false);

  useEffect(() => {
    setEett(project.especificacionesTecnicas || '');
  }, [project.especificacionesTecnicas]);

  useEffect(() => {
    setProveedor(project.proveedorAdjudicado || '');
  }, [project.proveedorAdjudicado]);

  const handleSaveEett = () => {
    const trimmed = eett.trim();
    if (trimmed !== (project.especificacionesTecnicas || '')) {
      onUpdateProject({
        ...project,
        especificacionesTecnicas: trimmed || undefined,
      });
      setSavedEett(true);
      setTimeout(() => setSavedEett(false), 2000);
    }
  };

  const handleSaveProveedor = () => {
    const trimmed = proveedor.trim();
    if (trimmed !== (project.proveedorAdjudicado || '')) {
      onUpdateProject({
        ...project,
        proveedorAdjudicado: trimmed || undefined,
      });
      setSavedProv(true);
      setTimeout(() => setSavedProv(false), 2000);
    }
  };

  const isStep1Done = Boolean(project.especificacionesTecnicas?.trim());
  const isStep2Done = Boolean(project.proveedorAdjudicado?.trim());
  const isStep3Done = Boolean(project.recepcionOk);
  const isStep4Done = Boolean(project.enviadoAPago);

  const completedCount = [isStep1Done, isStep2Done, isStep3Done, isStep4Done].filter(Boolean).length;

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      {/* Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">
            📋 Flujo de Abastecimiento y Pago (Marianela)
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {completedCount} de 4 completados
          </span>
        </div>
        {completedCount === 4 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Flujo de Pago Cerrado
          </span>
        )}
      </div>

      {/* 4-Step Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Paso 1: Especificaciones Técnicas */}
        <div
          className={`p-3 rounded-xl border transition-colors ${
            isStep1Done
              ? 'bg-emerald-50/40 border-emerald-300'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isStep1Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
              )}
              <span className={`text-xs font-bold ${isStep1Done ? 'text-emerald-950' : 'text-slate-800'}`}>
                Paso 1: Especificaciones Técnicas
              </span>
            </div>
            {savedEett && (
              <span className="text-[10px] font-bold text-emerald-700 animate-fade-in">
                ✓ Guardado
              </span>
            )}
          </div>

          <textarea
            rows={4}
            value={eett}
            onChange={(e) => setEett(e.target.value)}
            onBlur={handleSaveEett}
            placeholder="Detalle técnico para adquisición..."
            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-blue-600 focus:outline-none resize-y"
          />

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">Guarda al salir del campo</span>
            <button
              type="button"
              onClick={handleSaveEett}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* Paso 2: Proveedor Adjudicado */}
        <div
          className={`p-3 rounded-xl border transition-colors ${
            isStep2Done
              ? 'bg-emerald-50/40 border-emerald-300'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isStep2Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
              )}
              <span className={`text-xs font-bold ${isStep2Done ? 'text-emerald-950' : 'text-slate-800'}`}>
                Paso 2: Proveedor Adjudicado
              </span>
            </div>
            {savedProv && (
              <span className="text-[10px] font-bold text-emerald-700 animate-fade-in">
                ✓ Guardado
              </span>
            )}
          </div>

          <textarea
            rows={4}
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            onBlur={handleSaveProveedor}
            placeholder="Razón Social, RUT o datos de contacto del proveedor..."
            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-blue-600 focus:outline-none resize-y"
          />

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">Guarda al salir del campo</span>
            <button
              type="button"
              onClick={handleSaveProveedor}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* Paso 3: Recepción Técnica OK */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
            isStep3Done
              ? 'bg-emerald-50/60 border-emerald-400'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isStep3Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
              )}
              <span className={`text-xs font-bold ${isStep3Done ? 'text-emerald-950' : 'text-slate-800'}`}>
                Paso 3: Recepción Técnica OK
              </span>
            </div>

            <label className="flex items-center gap-2.5 p-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors select-none">
              <input
                type="checkbox"
                checked={Boolean(project.recepcionOk)}
                onChange={(e) =>
                  onUpdateProject({
                    ...project,
                    recepcionOk: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900 leading-tight">
                ✅ Recibido conforme por Técnico
              </span>
            </label>
          </div>

          <p className="text-[10px] text-slate-500 mt-2">
            Valida la entrega técnica conforme en terreno.
          </p>
        </div>

        {/* Paso 4: Envío a Pago */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
            isStep4Done
              ? 'bg-emerald-50/60 border-emerald-400'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isStep4Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                  4
                </span>
              )}
              <span className={`text-xs font-bold ${isStep4Done ? 'text-emerald-950' : 'text-slate-800'}`}>
                Paso 4: Envío a Pago
              </span>
            </div>

            <label className="flex items-center gap-2.5 p-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors select-none">
              <input
                type="checkbox"
                checked={Boolean(project.enviadoAPago)}
                onChange={(e) =>
                  onUpdateProject({
                    ...project,
                    enviadoAPago: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900 leading-tight">
                💸 Enviado a pago por Marianela
              </span>
            </label>
          </div>

          <p className="text-[10px] text-slate-500 mt-2">
            Factura u orden cursada formalmente a Finanzas.
          </p>
        </div>
      </div>
    </div>
  );
};

interface ProjectMilestonesTimelineProps {
  project: Project;
}

const ProjectMilestonesTimeline: React.FC<ProjectMilestonesTimelineProps> = ({ project }) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCompleted, setFormCompleted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchHitosForProject(project.id).then((data) => {
      if (isMounted) {
        setMilestones(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [project.id]);

  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => a.date.localeCompare(b.date));
  }, [milestones]);

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${day} ${months[month - 1] || ''} ${year}`;
    }
    return dStr;
  };

  const openAddModal = () => {
    setEditingMilestone(null);
    setFormTitle('');
    setFormDate(todayStr);
    setFormDescription('');
    setFormCompleted(false);
    setIsModalOpen(true);
  };

  const openEditModal = (hito: ProjectMilestone) => {
    setEditingMilestone(hito);
    setFormTitle(hito.title);
    setFormDate(hito.date);
    setFormDescription(hito.description || '');
    setFormCompleted(hito.completed);
    setIsModalOpen(true);
  };

  const handleToggleComplete = async (hito: ProjectMilestone) => {
    const updated: ProjectMilestone = { ...hito, completed: !hito.completed };
    setMilestones((prev) => prev.map((m) => (m.id === hito.id ? updated : m)));
    await updateHito(updated);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este hito del cronograma?')) {
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      await deleteHito(id, project.id);
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    if (editingMilestone) {
      const updated: ProjectMilestone = {
        ...editingMilestone,
        title: formTitle.trim(),
        date: formDate,
        description: formDescription.trim(),
        completed: formCompleted,
      };
      setMilestones((prev) => prev.map((m) => (m.id === editingMilestone.id ? updated : m)));
      setIsModalOpen(false);
      setEditingMilestone(null);
      await updateHito(updated);
    } else {
      const newHito = {
        projectId: project.id,
        title: formTitle.trim(),
        date: formDate,
        description: formDescription.trim(),
        completed: formCompleted,
      };
      const created = await insertHito(newHito);
      if (created) {
        setMilestones((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
    }
  };

  const completedCount = milestones.filter((m) => m.completed).length;

  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              ⏱️ Línea de Tiempo de Hitos
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {completedCount} de {milestones.length} completados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cronograma real de hitos, entregables y compromisos del proyecto.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Agregar Hito</span>
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="p-4 text-center text-xs text-slate-400">
          Cargando cronograma de hitos...
        </div>
      ) : sortedMilestones.length === 0 ? (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-xs font-semibold text-slate-700">
            No hay hitos registrados en este proyecto
          </p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
            Registra fechas clave del proyecto (ej. Bases técnicas, Adjudicación, Llegada de equipos, Puesta en marcha) para auditar el cumplimiento del cronograma institucional.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agregar Primer Hito</span>
          </button>
        </div>
      ) : (
        <div className="relative pl-8 pr-2 py-2">
          {/* Vertical timeline connector */}
          <div className="absolute left-3.5 top-3 bottom-4 w-0.5 bg-slate-200" />

          <div className="space-y-4">
            {sortedMilestones.map((hito) => {
              const isPast = hito.date < todayStr;
              const isOverdue = !hito.completed && isPast;

              return (
                <div key={hito.id} className="relative group">
                  {/* Circle marker on connector line */}
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(hito)}
                    title={hito.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                    className={`absolute -left-8 top-2 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                      hito.completed
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 hover:bg-emerald-700'
                        : isOverdue
                        ? 'bg-rose-600 text-white ring-4 ring-rose-100 animate-pulse hover:bg-rose-700'
                        : 'bg-white text-slate-500 border-2 border-slate-400 ring-4 ring-slate-100 hover:border-blue-600 hover:text-blue-600'
                    }`}
                  >
                    {hito.completed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isOverdue ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-blue-600" />
                    )}
                  </button>

                  {/* Card Content */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      hito.completed
                        ? 'bg-emerald-50/40 border-emerald-300'
                        : isOverdue
                        ? 'bg-rose-50/50 border-rose-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold ${
                            hito.completed
                              ? 'text-emerald-950 line-through decoration-emerald-600/50'
                              : isOverdue
                              ? 'text-rose-950 font-extrabold'
                              : 'text-slate-900'
                          }`}
                        >
                          {hito.title}
                        </span>

                        {/* Status badge */}
                        {hito.completed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completado
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Alerta de Retraso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-500" />
                            Pendiente
                          </span>
                        )}
                      </div>

                      {/* Date & Actions */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            isOverdue
                              ? 'text-rose-700 bg-rose-100/80 border border-rose-200'
                              : hito.completed
                              ? 'text-emerald-700 bg-emerald-100/60'
                              : 'text-slate-600 bg-slate-100 border border-slate-200'
                          }`}
                        >
                          📅 {formatDisplayDate(hito.date)}
                        </span>

                        <button
                          type="button"
                          onClick={() => openEditModal(hito)}
                          className="p-1 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Editar hito"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(hito.id)}
                          className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Eliminar hito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {hito.description && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                        {hito.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mini-Modal: Agregar / Editar Hito */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">
                  {editingMilestone ? 'Editar Hito de Cronograma' : 'Nuevo Hito de Cronograma'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título del Hito <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ej. Adjudicación de Proveedor o Entrega de Equipos"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha Clave <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Si la fecha es anterior a hoy y no está completado, se marcará en rojo con alerta de retraso.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción / Entregables (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detalles sobre lo que se espera verificar o recibir en esta fecha..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none resize-y"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={formCompleted}
                    onChange={(e) => setFormCompleted(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Hito Completado
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Marca este hito como cumplido (se mostrará en verde en la línea de tiempo).
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingMilestone ? 'Guardar Cambios' : 'Registrar Hito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface CostVarianceControlProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
}

const CostVarianceControl: React.FC<CostVarianceControlProps> = ({ project, onUpdateProject }) => {
  const handleItemCostChange = (
    itemId: string,
    field: 'montoCotizadoCLP' | 'montoEjecutadoFinalCLP',
    val: number | undefined
  ) => {
    const updatedItems = (project.items || []).map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          [field]: val,
        };
      }
      return it;
    });
    onUpdateProject({
      ...project,
      items: updatedItems,
    });
  };

  const items = project.items || [];
  const totalPlanificado = items.reduce((acc, it) => acc + (it.totalPriceCLP || 0), 0);
  const totalCotizado = items.reduce(
    (acc, it) => acc + (it.montoCotizadoCLP !== undefined && it.montoCotizadoCLP !== null ? it.montoCotizadoCLP : (it.totalPriceCLP || 0)),
    0
  );
  const totalEjecutado = items.reduce(
    (acc, it) => acc + (it.montoEjecutadoFinalCLP !== undefined && it.montoEjecutadoFinalCLP !== null ? it.montoEjecutadoFinalCLP : 0),
    0
  );
  const totalVariacion = totalCotizado - totalPlanificado;

  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      {/* Encabezado de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">
            💰 Control de Costos y Variaciones
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
          </span>
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium">
              Planificado: <strong className="text-slate-900">{formatCLP(totalPlanificado)}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">
              Cotizado: <strong className="text-slate-900">{formatCLP(totalCotizado)}</strong>
            </span>
            <span className="text-slate-300">|</span>
            {totalVariacion > 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                Desvío: +{formatCLP(totalVariacion)} (Sobrecosto)
              </span>
            ) : totalVariacion < 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Desvío: {formatCLP(totalVariacion)} (Ahorro)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Desvío: $0 (Exacto)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabla con scroll de altura máxima */}
      {items.length === 0 ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
          No hay ítems registrados en este proyecto para auditar costos.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="max-h-60 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 min-w-[200px]">Descripción del Ítem</th>
                  <th className="py-2.5 px-3 text-right w-36 whitespace-nowrap">Costo Planificado</th>
                  <th className="py-2.5 px-3 text-right w-44 whitespace-nowrap">Monto Cotizado</th>
                  <th className="py-2.5 px-3 text-right w-44 whitespace-nowrap">Monto Ejecutado Final</th>
                  <th className="py-2.5 px-3 text-center w-48 whitespace-nowrap">Variación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const cotizado = item.montoCotizadoCLP !== undefined && item.montoCotizadoCLP !== null 
                    ? item.montoCotizadoCLP 
                    : item.totalPriceCLP;
                  const variacion = cotizado - item.totalPriceCLP;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Descripción del Ítem con justificación en letra pequeña */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {item.description}
                        </div>
                        {item.justification && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5 leading-tight">
                            {item.justification}
                          </div>
                        )}
                        {item.accountCode && (
                          <span className="inline-block mt-1 font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                            Cuenta {item.accountCode} · Cant: {item.quantity}
                          </span>
                        )}
                      </td>

                      {/* Costo Planificado (solo lectura) */}
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatCLP(item.totalPriceCLP)}
                      </td>

                      {/* Monto Cotizado: Input numérico */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end w-full">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.montoCotizadoCLP !== undefined && item.montoCotizadoCLP !== null ? item.montoCotizadoCLP : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0);
                              handleItemCostChange(item.id, 'montoCotizadoCLP', val);
                            }}
                            placeholder={String(item.totalPriceCLP)}
                            className="w-32 px-2.5 py-1 text-right font-medium text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </td>

                      {/* Monto Ejecutado Final: Input numérico */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end w-full">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.montoEjecutadoFinalCLP !== undefined && item.montoEjecutadoFinalCLP !== null ? item.montoEjecutadoFinalCLP : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0);
                              handleItemCostChange(item.id, 'montoEjecutadoFinalCLP', val);
                            }}
                            placeholder="0"
                            className="w-32 px-2.5 py-1 text-right font-medium text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </td>

                      {/* Variación */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {variacion > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            +{formatCLP(variacion)} (Sobrecosto)
                          </span>
                        ) : variacion < 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {formatCLP(variacion)} (Ahorro)
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            $0 (Exacto)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

interface Stage5EjecucionControlProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  onAddProject?: (project: Project) => void;
  currentRole: Role;
  currentFiscalYear?: number;
}

export const Stage5EjecucionControl: React.FC<Stage5EjecucionControlProps> = ({
  projects,
  onUpdateProject,
  onAddProject,
  currentRole,
  currentFiscalYear = 2026,
}) => {
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Only projects that have been authorized and initiated (not 'No Iniciado')
  const authorizedProjects = projects.filter((p) => p.executionStatus !== 'No Iniciado');

  // Master-Detail Selection & Local States
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [itemStates, setItemStates] = useState<Record<string, string>>({});

  // Delay Bitacora Modal State (enforced when marked as 'Atrasado')
  const [bitacoraModalProject, setBitacoraModalProject] = useState<Project | null>(null);
  const [bitacoraReason, setBitacoraReason] = useState('');
  const [bitacoraCorrectiveAction, setBitacoraCorrectiveAction] = useState('');
  const [bitacoraResolutionDate, setBitacoraResolutionDate] = useState('');
  const [viewHistoryProject, setViewHistoryProject] = useState<Project | null>(null);

  // Global Execution Calculations (based only on authorized projects)
  const totalApproved = authorizedProjects.reduce((sum, p) => sum + (p.approvedCeilingCLP ?? p.requestedBudgetCLP), 0);
  const totalExecuted = authorizedProjects.reduce((sum, p) => sum + p.executedBudgetCLP, 0);
  const totalAvailable = Math.max(0, totalApproved - totalExecuted);
  const executionPercentage = totalApproved > 0 ? Math.round((totalExecuted / totalApproved) * 100) : 0;

  const atrasadosCount = authorizedProjects.filter((p) => p.executionStatus === 'Atrasado').length;
  const enRiesgoCount = authorizedProjects.filter((p) => p.executionStatus === 'En Riesgo').length;
  const completadosCount = authorizedProjects.filter((p) => p.executionStatus === 'Completado').length;
  const extraCount = authorizedProjects.filter((p) => p.isExtrapresupuestario).length;

  const filteredProjects = authorizedProjects.filter((p) => {
    const matchMonth = filterMonth === 'all' || p.estimatedStartMonth === parseInt(filterMonth, 10);
    const matchStatus = filterStatus === 'all' || p.executionStatus === filterStatus;
    const matchSearch =
      searchTerm === '' ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.responsible.toLowerCase().includes(searchTerm.toLowerCase());
    return matchMonth && matchStatus && matchSearch;
  });

  // Active Project for Detail View
  const activeProject = useMemo(() => {
    if (selectedProjectId) {
      const found = filteredProjects.find((p) => p.id === selectedProjectId);
      if (found) return found;
    }
    return filteredProjects[0] || null;
  }, [filteredProjects, selectedProjectId]);

  // Group Projects by Area for Tree Navigation
  const projectsByArea = useMemo(() => {
    const map = new Map<Area, Project[]>();
    filteredProjects.forEach((p) => {
      const list = map.get(p.area) || [];
      list.push(p);
      map.set(p.area, list);
    });
    return Array.from(map.entries());
  }, [filteredProjects]);

  const getStatusDotColor = (status: ExecutionStatus) => {
    switch (status) {
      case 'Completado':
        return 'bg-emerald-500';
      case 'Atrasado':
        return 'bg-rose-500';
      case 'En Plazo':
        return 'bg-blue-500';
      case 'Pausado':
        return 'bg-orange-500';
      case 'En Riesgo':
        return 'bg-amber-400';
      default:
        return 'bg-slate-400';
    }
  };

  // Handle Status Change with strict bitácora enforcement for 'Atrasado'
  const handleStatusChange = (project: Project, newStatus: ExecutionStatus) => {
    if (newStatus === 'Atrasado') {
      // Open modal to enforce bitácora logging before setting to Atrasado
      setBitacoraModalProject(project);
      setBitacoraReason('');
      setBitacoraCorrectiveAction('');
      setBitacoraResolutionDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    } else {
      let progress = project.progressPercentage;
      if (newStatus === 'Completado') {
        progress = 100;
      }
      onUpdateProject({
        ...project,
        executionStatus: newStatus,
        progressPercentage: progress,
      });
    }
  };

  // Submit Bitácora entry for delayed project
  const handleSaveBitacora = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bitacoraModalProject) return;

    if (!bitacoraReason.trim() || !bitacoraCorrectiveAction.trim() || !bitacoraResolutionDate) {
      alert('Debe completar el motivo del retraso, la acción correctiva y la fecha de resolución.');
      return;
    }

    const newEntry: BitacoraEntry = {
      id: `bita-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      reason: bitacoraReason.trim(),
      correctiveAction: bitacoraCorrectiveAction.trim(),
      expectedResolutionDate: bitacoraResolutionDate,
      author: currentRole === 'coordinador' ? 'Paola (Coordinadora TIC)' : 'Técnico Responsable',
      role: currentRole,
    };

    onUpdateProject({
      ...bitacoraModalProject,
      executionStatus: 'Atrasado',
      bitacora: [newEntry, ...bitacoraModalProject.bitacora],
    });

    setBitacoraModalProject(null);
  };

  // Update progress percentage and executed amount
  const handleProgressChange = (project: Project, newProgress: number) => {
    const validProgress = Math.min(100, Math.max(0, newProgress));
    const ceiling = project.approvedCeilingCLP ?? project.requestedBudgetCLP;
    const calculatedExecuted = Math.round((ceiling * validProgress) / 100);

    let status = project.executionStatus;
    if (validProgress === 100) {
      status = 'Completado';
    } else if (validProgress > 0 && status === 'No Iniciado') {
      status = 'En Plazo';
    }

    onUpdateProject({
      ...project,
      progressPercentage: validProgress,
      executedBudgetCLP: calculatedExecuted,
      executionStatus: status,
    });
  };

  const handleExecutedAmountChange = (project: Project, amount: number) => {
    const validAmount = Math.max(0, amount);
    const ceiling = project.approvedCeilingCLP ?? project.requestedBudgetCLP;
    const progress = ceiling > 0 ? Math.min(100, Math.round((validAmount / ceiling) * 100)) : 0;

    let status = project.executionStatus;
    if (progress === 100) {
      status = 'Completado';
    }

    onUpdateProject({
      ...project,
      executedBudgetCLP: validAmount,
      progressPercentage: progress,
      executionStatus: status,
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner Context */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#da291c] uppercase tracking-wider mb-1">
              <span>Etapa 5 de 5</span>
              <span>·</span>
              <span>Operación Anual & Monitoreo Mensual</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Ejecución y Control Técnico (Todo el Equipo)
            </h2>
            <p className="text-base text-slate-600 mt-1 max-w-4xl">
              Seguimiento de la ejecución física y financiera mensual en Sede Talca. Si un proyecto se marca como <strong>Atrasado</strong>, el sistema exige de forma estricta registrar una bitácora con causa raíz y fecha de normalización.
            </p>
          </div>
        </div>

        {/* 4 Financial Control Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Presupuesto Vigente Aprobado</p>
            <p className="text-2xl font-bold text-slate-900 font-tabular mt-1">
              {formatCLP(totalApproved)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Techo operativo anual</p>
          </div>

          <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900">Total Facturado / Ejecutado</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                {executionPercentage}%
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 font-tabular mt-1">
              {formatCLP(totalExecuted)}
            </p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-700 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, executionPercentage)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <p className="text-sm font-medium text-emerald-900">Saldo Remanente Disponible</p>
            <p className="text-2xl font-bold text-emerald-900 font-tabular mt-1">
              {formatCLP(totalAvailable)}
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Fondo libre para contingencias o remanentes
            </p>
          </div>

          <div
            className={`p-4 rounded-lg border ${
              atrasadosCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Estado de Proyectos</p>
              {atrasadosCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                  {atrasadosCount} Atrasados
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 mt-2 font-medium">
              <span className="text-emerald-700 font-bold">{completadosCount}</span> listos ·{' '}
              <span className="text-amber-700 font-bold">{enRiesgoCount}</span> en riesgo ·{' '}
              <span className="text-purple-700 font-bold">{extraCount}</span> extras
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Month Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar proyecto en ejecución..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-900 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Mes Inicio:</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 focus:bg-white"
            >
              <option value="all">Todo el Año</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Estado:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 focus:bg-white"
            >
              <option value="all">Todos</option>
              <option value="En Plazo">En Plazo</option>
              <option value="Atrasado">Atrasado</option>
              <option value="En Riesgo">En Riesgo</option>
              <option value="Completado">Completado</option>
              <option value="Pausado">Pausado</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-slate-500 font-medium">
          {filteredProjects.length} proyectos en seguimiento
        </div>
      </div>

      {/* Master-Detail Layout */}
      {authorizedProjects.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Activity className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Aún no hay proyectos autorizados en ejecución.
          </h3>
          <p className="text-base text-slate-600 mb-4 max-w-md mx-auto">
            Ve a la Etapa 4 para financiar y presionar 'Iniciar Ejecución' en los proyectos.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Column: Navigation Panel (25% width / w-full lg:w-1/4 shrink-0) */}
          <div className="w-full lg:w-1/4 shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-[#da291c]" />
                <h3 className="text-sm font-bold text-slate-900">Árbol por Áreas</h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {filteredProjects.length}
              </span>
            </div>

            {projectsByArea.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">
                No hay proyectos que coincidan con los filtros.
              </p>
            ) : (
              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                {projectsByArea.map(([areaName, areaProjects]) => (
                  <div key={areaName} className="space-y-1.5">
                    <div className="flex items-center justify-between px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100/80 rounded-md border border-slate-200 uppercase tracking-wide">
                      <span>{areaName}</span>
                      <span className="text-[10px] bg-white text-slate-700 px-1.5 py-0.2 rounded-full font-bold border border-slate-200">
                        {areaProjects.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {areaProjects.map((p) => {
                        const isSelected = activeProject?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedProjectId(p.id)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 cursor-pointer ${
                              isSelected
                                ? 'bg-red-50/90 border-[#da291c] text-slate-900 shadow-xs ring-1 ring-[#da291c]/40 font-semibold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${getStatusDotColor(p.executionStatus)}`}
                              title={`Estado: ${p.executionStatus}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[11px] font-bold text-slate-600 truncate">{p.code}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0">
                                  {p.progressPercentage}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-900 truncate mt-0.5 leading-snug">{p.title}</p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.responsible}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Indicator Dot Legend */}
            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-1.5 text-[10px] text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Completado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span>En Plazo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>Atrasado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <span>Pausado</span>
              </div>
            </div>
          </div>

          {/* Right Column: Detail Panel (75% width / flex-1 min-w-0) */}
          <div className="w-full lg:w-3/4 flex-1 min-w-0">
            {!activeProject ? (
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-16 text-center shadow-xs">
                <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <h4 className="text-lg font-bold text-slate-800">Seleccione un proyecto del panel izquierdo</h4>
                <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  Haga clic en cualquiera de los proyectos agrupados por área en el árbol de navegación para gestionar su avance físico, financiero, plazos y flujo de abastecimiento.
                </p>
              </div>
            ) : (() => {
              const ceiling = activeProject.approvedCeilingCLP ?? activeProject.requestedBudgetCLP;
              const remaining = Math.max(0, ceiling - activeProject.executedBudgetCLP);
              const isDelayed = activeProject.executionStatus === 'Atrasado';

              return (
                <div
                  key={activeProject.id}
                  className={`bg-white border rounded-xl p-6 shadow-xs transition-all space-y-6 ${
                    isDelayed
                      ? 'border-rose-300 bg-rose-50/15'
                      : activeProject.executionStatus === 'Completado'
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Header & Identification */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded">
                        {activeProject.code}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-800">
                        {activeProject.area}
                      </span>
                      <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                        Mes: <strong>{MONTH_NAMES[activeProject.estimatedStartMonth - 1]} {activeProject.fiscalYear || currentFiscalYear}</strong>
                      </span>
                      {activeProject.isExtrapresupuestario && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-purple-100 text-purple-900 border border-purple-200">
                          Extrapresupuestario
                        </span>
                      )}
                      <span className={`text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1.5 ${
                        isDelayed
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : activeProject.executionStatus === 'Completado'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : activeProject.executionStatus === 'En Plazo'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-slate-100 text-slate-800 border border-slate-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${getStatusDotColor(activeProject.executionStatus)}`} />
                        {activeProject.executionStatus}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">
                        {activeProject.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        Responsable Técnico: <strong className="text-slate-800">{activeProject.responsible}</strong>
                      </p>
                    </div>

                    {/* Delay Alert Banner & Bitacora Trigger */}
                    {isDelayed && (
                      <div className="p-3.5 bg-rose-100/90 border border-rose-300 rounded-lg text-xs space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <span>PROYECTO MARCADO COMO ATRASADO</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewHistoryProject(activeProject)}
                            className="text-blue-800 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            Ver Bitácora ({activeProject.bitacora.length})
                          </button>
                        </div>
                        {activeProject.bitacora[0] && (
                          <div className="text-rose-900 space-y-1">
                            <p><strong>Causa Raíz:</strong> {activeProject.bitacora[0].reason}</p>
                            <p><strong>Acción Correctiva:</strong> {activeProject.bitacora[0].correctiveAction}</p>
                            <p><strong>Fecha Estimada de Resolución:</strong> {activeProject.bitacora[0].expectedResolutionDate}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {!isDelayed && activeProject.bitacora.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewHistoryProject(activeProject)}
                        className="text-xs text-slate-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        Ver historial de bitácora ({activeProject.bitacora.length})
                      </button>
                    )}
                  </div>

                  {/* Plazos & Compromisos */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#da291c]" />
                        <span>Fecha Límite de Entrega (Compromiso Operativo)</span>
                      </label>
                      <input
                        type="date"
                        value={deadlines[activeProject.id] || ''}
                        onChange={(e) => setDeadlines({ ...deadlines, [activeProject.id]: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Plazo fatal acordado con Dirección Sede Talca para recepción conforme.
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Mes Programado de Inicio</span>
                      </span>
                      <div className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900">
                        {MONTH_NAMES[activeProject.estimatedStartMonth - 1]} {activeProject.fiscalYear || currentFiscalYear}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Cronograma oficial según formulación presupuestaria.
                      </span>
                    </div>
                  </div>

                  {/* Control Financiero y Físico */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-4 bg-white border border-slate-200 rounded-xl">
                    {/* Financial Execution */}
                    <div className="space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5">
                        💰 Control Financiero
                      </h4>
                      
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-600 font-medium">Presupuesto Vigente:</span>
                        <span className="text-sm font-bold font-tabular text-slate-900">
                          {formatCLP(ceiling)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-blue-900 font-bold">Monto Ejecutado (Facturado):</span>
                        <div className="w-36">
                          <input
                            type="number"
                            step="100000"
                            value={activeProject.executedBudgetCLP}
                            onChange={(e) =>
                              handleExecutedAmountChange(activeProject, parseInt(e.target.value, 10) || 0)
                            }
                            className="w-full p-1.5 text-sm font-bold font-tabular text-right border border-slate-300 rounded-lg bg-white text-blue-900 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-600 font-medium">Saldo por Ejecutar:</span>
                        <span className="text-sm font-bold font-tabular text-emerald-700">
                          {formatCLP(remaining)}
                        </span>
                      </div>
                    </div>

                    {/* Physical Progress & Status */}
                    <div className="space-y-3.5 lg:border-l lg:border-slate-100 lg:pl-5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5">
                        📊 Avance Físico & Estado
                      </h4>

                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-700">Avance Físico:</span>
                          <span className="text-blue-900 font-bold font-tabular text-sm">
                            {activeProject.progressPercentage}%
                          </span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={activeProject.progressPercentage}
                          onChange={(e) =>
                            handleProgressChange(activeProject, parseInt(e.target.value, 10))
                          }
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
                        />

                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <button type="button" onClick={() => handleProgressChange(activeProject, 0)} className="hover:text-blue-700 cursor-pointer">0%</button>
                          <button type="button" onClick={() => handleProgressChange(activeProject, 25)} className="hover:text-blue-700 cursor-pointer">25%</button>
                          <button type="button" onClick={() => handleProgressChange(activeProject, 50)} className="hover:text-blue-700 cursor-pointer">50%</button>
                          <button type="button" onClick={() => handleProgressChange(activeProject, 75)} className="hover:text-blue-700 cursor-pointer">75%</button>
                          <button type="button" onClick={() => handleProgressChange(activeProject, 100)} className="hover:text-blue-700 cursor-pointer">100%</button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Estado de Ejecución:
                        </label>
                        <select
                          value={activeProject.executionStatus}
                          onChange={(e) =>
                            handleStatusChange(activeProject, e.target.value as ExecutionStatus)
                          }
                          className={`w-full p-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                            isDelayed
                              ? 'bg-rose-100 border-rose-400 text-rose-900'
                              : activeProject.executionStatus === 'Completado'
                              ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                              : activeProject.executionStatus === 'En Riesgo'
                              ? 'bg-amber-100 border-amber-400 text-amber-900'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="No Iniciado">No Iniciado</option>
                          <option value="En Plazo">En Plazo</option>
                          <option value="En Riesgo">En Riesgo</option>
                          <option value="Atrasado">⚠️ Atrasado (Exige Bitácora)</option>
                          <option value="Completado">✓ Completado</option>
                          <option value="Pausado">Pausado</option>
                        </select>

                        <label
                          className="mt-2.5 flex items-start gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium bg-slate-50 hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"
                          title="Marca este proyecto cuando Paola ya lo haya cargado en APRE, para evitar descontar dos veces la ejecución en la Bolsa de Proyectos."
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(activeProject.reportedToApre)}
                            onChange={() =>
                              onUpdateProject({
                                ...activeProject,
                                reportedToApre: !activeProject.reportedToApre,
                              })
                            }
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#da291c] focus:ring-[#da291c] cursor-pointer"
                          />
                          <div className="leading-tight">
                            <span className="font-semibold text-slate-800">Marcar como reportado a APRE</span>
                            <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                              Evita duplicar descuento de saldo ejecutado en Bolsa
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Justificación del Proyecto */}
                  {activeProject.justification && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span>Justificación Técnica y Operativa</span>
                      </h4>
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {activeProject.justification}
                      </p>
                    </div>
                  )}

                  {/* Ítems del Proyecto con Selector de Estado */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>📦 Ítems Presupuestados ({activeProject.items.length})</span>
                      </h4>
                      <span className="text-xs font-semibold text-slate-600">
                        Total Ítems: <strong className="text-slate-900 font-tabular">{formatCLP(activeProject.items.reduce((s, it) => s + it.totalPriceCLP, 0))}</strong>
                      </span>
                    </div>

                    {activeProject.items.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-3 text-center bg-slate-50 rounded-lg border border-slate-200">
                        No hay ítems registrados para este proyecto.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                              <th className="py-2.5 px-3">Descripción del Bien o Servicio</th>
                              <th className="py-2.5 px-3 text-center w-24">Cantidad</th>
                              <th className="py-2.5 px-3 text-right w-32">Total CLP</th>
                              <th className="py-2.5 px-3 text-center w-36">Estado Entrega</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activeProject.items.map((it) => {
                              const currentState = itemStates[it.id] || 'Pendiente';
                              return (
                                <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-3 font-medium text-slate-900">
                                    <div>{it.description}</div>
                                    {it.accountCode && (
                                      <span className="inline-block mt-0.5 font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                        Cuenta {it.accountCode}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-tabular font-medium text-slate-700">
                                    {it.quantity}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-tabular font-bold text-slate-900">
                                    {formatCLP(it.totalPriceCLP)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <select
                                      value={currentState}
                                      onChange={(e) => setItemStates({ ...itemStates, [it.id]: e.target.value })}
                                      className={`py-1 px-2 text-[11px] font-bold rounded-lg border cursor-pointer ${
                                        currentState === 'Recibido'
                                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                          : currentState === 'En Proceso'
                                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                                          : 'bg-amber-50 text-amber-900 border-amber-300'
                                      }`}
                                    >
                                      <option value="Pendiente">Pendiente</option>
                                      <option value="En Proceso">En Proceso</option>
                                      <option value="Recibido">Recibido</option>
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Zona de Adjuntos */}
                  <div className="p-4 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/60 rounded-xl text-center cursor-pointer transition-colors group">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                      <span className="text-base">📎</span>
                      <span>Arrastra o haz clic para adjuntar documento (Factura, Cotización, Acta)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Formatos permitidos: PDF, DOCX, XLSX, JPG o PNG hasta 20 MB (Archivo local institucional)
                    </p>
                  </div>

                  {/* Flujo de Abastecimiento y Pago (Marianela) */}
                  <MarianelaStepper project={activeProject} onUpdateProject={onUpdateProject} />

                  {/* Línea de Tiempo de Hitos */}
                  <ProjectMilestonesTimeline project={activeProject} />

                  {/* Control de Costos y Variaciones */}
                  <CostVarianceControl project={activeProject} onUpdateProject={onUpdateProject} />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Mandatory Modal: Delay Bitácora Logging */}
      {bitacoraModalProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-rose-300 overflow-hidden">
            <div className="bg-rose-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-base font-bold">Registro Obligatorio de Bitácora por Atraso</h3>
                  <p className="text-xs text-rose-100">{bitacoraModalProject.code} · {bitacoraModalProject.title}</p>
                </div>
              </div>
              <button
                onClick={() => setBitacoraModalProject(null)}
                className="text-rose-200 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBitacora} className="p-6 space-y-4">
              <p className="text-sm text-slate-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
                La política de control institucional de la Universidad Autónoma exige registrar formalmente la causa raíz del retraso y las medidas de mitigación adoptadas para regularizar la entrega.
              </p>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Motivo / Causa Raíz del Retraso <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={bitacoraReason}
                  onChange={(e) => setBitacoraReason(e.target.value)}
                  placeholder="Ej: Quiebre de stock nacional en mayorista de hardware, paro aduanero o retraso de obras civiles..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Acción Correctiva Adoptada <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={bitacoraCorrectiveAction}
                  onChange={(e) => setBitacoraCorrectiveAction(e.target.value)}
                  placeholder="Ej: Se activó cotización con proveedor regional alternativo de Talca con despacho prioritario..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Nueva Fecha Estimada de Regularización <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={bitacoraResolutionDate}
                  onChange={(e) => setBitacoraResolutionDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setBitacoraModalProject(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm"
                >
                  Guardar Bitácora y Marcar Atrasado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Bitácora History */}
      {viewHistoryProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Historial de Bitácora y Justificaciones</h3>
                <p className="text-xs text-slate-400">{viewHistoryProject.code} · {viewHistoryProject.title}</p>
              </div>
              <button
                onClick={() => setViewHistoryProject(null)}
                className="text-slate-400 hover:text-white p-1 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {viewHistoryProject.bitacora.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No hay entradas registradas en la bitácora de este proyecto.</p>
              ) : (
                viewHistoryProject.bitacora.map((entry) => (
                  <div key={entry.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-200">
                      <span className="font-semibold text-slate-700">Fecha de Registro: {entry.date}</span>
                      <span>Registrado por: <strong>{entry.author}</strong></span>
                    </div>
                    <div className="text-sm text-slate-800">
                      <p className="font-bold text-rose-900">Motivo del Retraso:</p>
                      <p className="mt-0.5">{entry.reason}</p>
                    </div>
                    <div className="text-sm text-slate-800">
                      <p className="font-bold text-blue-900">Acción Correctiva:</p>
                      <p className="mt-0.5">{entry.correctiveAction}</p>
                    </div>
                    <div className="text-xs font-semibold text-emerald-800 pt-1">
                      Fecha Estimada de Solución: {entry.expectedResolutionDate}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-100 flex justify-end">
              <button
                onClick={() => setViewHistoryProject(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
