import React, { useState } from 'react';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  isSupabaseConfigured,
  SUPABASE_SQL_SCHEMA,
  SUPABASE_MIGRATION_SQL
} from '../lib/supabase';
import { 
  seedInitialProjectsToSupabase, 
  seedInitialApreToSupabase 
} from '../services/supabaseService';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  Trash2, 
  ExternalLink,
  ShieldCheck,
  Server,
  FileCode
} from 'lucide-react';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsUpdated: () => void;
}

export const SupabaseConnectionModal: React.FC<SupabaseConnectionModalProps> = ({
  isOpen,
  onClose,
  onCredentialsUpdated,
}) => {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      alert('Por favor complete la URL y la Anon Key de Supabase.');
      return;
    }
    saveSupabaseCredentials(url, anonKey);
    setStatusMessage('Credenciales de Supabase guardadas exitosamente.');
    onCredentialsUpdated();
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    if (confirm('¿Desea desconectar y volver al almacenamiento local?')) {
      clearSupabaseCredentials();
      setUrl('');
      setAnonKey('');
      onCredentialsUpdated();
      setStatusMessage('Desconectado de Supabase. Operando en modo local.');
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleCopyMigration = () => {
    navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 3000);
  };

  const handleSeedData = async () => {
    setIsTesting(true);
    setStatusMessage('Sembrando proyectos y presupuesto APRE en Supabase...');
    try {
      await seedInitialProjectsToSupabase();
      await seedInitialApreToSupabase();
      setStatusMessage('¡Datos iniciales sembrados exitosamente en la base de datos de Supabase!');
      onCredentialsUpdated();
    } catch (e) {
      setStatusMessage('Error al sembrar datos. Verifique si ejecutó el script SQL en Supabase.');
    } finally {
      setIsTesting(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Header */}
        <div className="bg-[#000000] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#da291c]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#da291c] text-white rounded-lg shadow-sm font-bold text-xs">
              UA
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Conexión a Base de Datos Supabase</h3>
              <p className="text-xs text-[#d2d2d2]">
                Persistencia real de Proyectos, Ítems, Cuentas Contables y APRE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#d2d2d2] hover:text-white p-1 text-xl font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Badge */}
          <div className="p-4 rounded-xl border flex items-center justify-between gap-4 bg-slate-50">
            <div className="flex items-center gap-3">
              {isConfigured ? (
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Estado: {isConfigured ? '🟢 Conectado a Supabase' : '⚪ Modo Almacenamiento Local (Offline)'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isConfigured
                    ? 'Las operaciones de lectura y escritura se sincronizan en PostgreSQL en la nube.'
                    : 'Sin credenciales configuradas. La aplicación utiliza almacenamiento en memoria y localStorage.'}
                </p>
              </div>
            </div>

            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 px-2.5 py-1.5 rounded border border-rose-300 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            )}
          </div>

          {statusMessage && (
            <div className="p-3 bg-blue-50 text-blue-900 text-sm font-bold rounded-lg border border-blue-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Credenciales de Conexión
            </h4>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                SUPABASE_URL (Project URL) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-600"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Encontrará su Project URL en el panel de Supabase → Project Settings → API.
              </span>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                SUPABASE_ANON_KEY (Public Key) <span className="text-rose-600">*</span>
              </label>
              <input
                type="password"
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-600"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Clave pública anónima (anon public key) con permisos de lectura/escritura autorizados.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                También puede definir <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en su <code>.env</code>.
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#da291c] hover:bg-[#b81e13] text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer ring-1 ring-white/20"
              >
                Guardar y Conectar
              </button>
            </div>
          </form>

          {/* SQL Setup Helper */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-blue-700" />
                  <span>Scripts SQL para Supabase (SQL Editor)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ejecute en el <strong>SQL Editor</strong> de Supabase para crear o migrar columnas sin perder datos.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyMigration}
                  title="Añade approved_ceiling_clp, fiscal_year, etc. a tablas existentes"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedMigration ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Migración Copiada!</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3.5 h-3.5 text-amber-700" />
                      <span>Copiar Migración (ALTER TABLE)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopySql}
                  title="Crea todas las tablas desde cero"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Script Completo</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs text-blue-900 leading-relaxed">
              💡 <strong>Compatibilidad Inteligente:</strong> La aplicación omite automáticamente y reintenta de forma transparente cualquier columna que aún no haya sido agregada en su base de datos Supabase (ej. <code>approved_ceiling_clp</code> o <code>fiscal_year</code>), garantizando sincronización sin bloqueos ni errores en pantalla.
            </div>

            {isConfigured && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">
                  ¿Tablas recién creadas y vacías? Siembre el presupuesto y los proyectos iniciales:
                </span>
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleSeedData}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Sembrar Datos Iniciales</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
