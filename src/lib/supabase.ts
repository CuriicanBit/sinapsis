import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite env or localStorage
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('ua_supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('ua_supabase_anon_key') || '' : '';

  const url = (localUrl || envUrl).trim();
  const anonKey = (localKey || envKey).trim();

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return (
    Boolean(url) &&
    Boolean(anonKey) &&
    url.startsWith('https://') &&
    !url.includes('your-project-id') &&
    !anonKey.includes('your-anon-public-key')
  );
}

// Singleton client instance
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.warn('Error initializing Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ua_supabase_url', url.trim());
    localStorage.setItem('ua_supabase_anon_key', anonKey.trim());
    supabaseInstance = null; // Reset to force re-instantiation
  }
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ua_supabase_url');
    localStorage.removeItem('ua_supabase_anon_key');
    supabaseInstance = null;
  }
}

// SQL Script generator for the user to execute in Supabase SQL editor
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================
-- UNIVERSIDAD AUTÓNOMA DE CHILE (SEDE TALCA)
-- ESQUEMA DE BASE DE DATOS PRESUPUESTARIA TIC 2026 EN SUPABASE
-- ==============================================================

-- 1. Tabla de Proyectos de Formulación y Ejecución TIC
CREATE TABLE IF NOT EXISTS proyectos (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  area TEXT NOT NULL,
  responsible TEXT NOT NULL,
  estimated_start_month INTEGER NOT NULL DEFAULT 1,
  justification TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'En Revisión',
  director_notes TEXT,
  requested_budget_clp NUMERIC NOT NULL DEFAULT 0,
  approved_ceiling_clp NUMERIC,
  executed_budget_clp NUMERIC NOT NULL DEFAULT 0,
  progress_percentage NUMERIC NOT NULL DEFAULT 0,
  execution_status TEXT NOT NULL DEFAULT 'No Iniciado',
  is_extrapresupuestario BOOLEAN NOT NULL DEFAULT FALSE,
  paused_in_post_cut BOOLEAN NOT NULL DEFAULT FALSE,
  apre_codigo_pres TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Ítems de Gasto e Inversión por Proyecto
CREATE TABLE IF NOT EXISTS items_gasto (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  justification TEXT DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price_clp NUMERIC NOT NULL DEFAULT 0,
  total_price_clp NUMERIC NOT NULL DEFAULT 0,
  account_code TEXT, -- Cuenta contable oficial asignada en Etapa 2
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Presupuesto Aprobado APRE (Etapa 3)
CREATE TABLE IF NOT EXISTS apre_presupuesto_aprobado (
  id TEXT PRIMARY KEY,
  codigo_pres TEXT NOT NULL,
  distribucion TEXT,
  ano INTEGER DEFAULT 2026,
  sucursal TEXT DEFAULT 'TALCA',
  codigo_tipo_cuenta TEXT,
  tipo_cuenta TEXT,
  codigo_centro TEXT DEFAULT '621007',
  centro_costo TEXT DEFAULT 'INFORMÁTICA',
  codigo_grupo_cuenta TEXT,
  grupo_cuenta TEXT,
  codigo_cuenta TEXT NOT NULL,
  cuenta_contable TEXT NOT NULL,
  codigo_item TEXT,
  item_costo TEXT,
  detalle TEXT,
  justificacion TEXT,
  cantidad_desc TEXT,
  monto_total NUMERIC NOT NULL DEFAULT 0,
  monto_ejecutado NUMERIC NOT NULL DEFAULT 0,
  saldo NUMERIC NOT NULL DEFAULT 0,
  divisa TEXT DEFAULT 'PESO CHILENO',
  cta_corriente TEXT DEFAULT '44074221',
  usuario_cre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Cuentas Contables Oficiales Institucionales
CREATE TABLE IF NOT EXISTS cuentas_contables (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Activo' o 'Gasto'
  category_label TEXT, -- 'Inversión', 'Operación', 'Gastos', etc.
  description TEXT
);

-- 5. Tabla de Traspasos de Saldo entre Áreas (Etapa 4 - Bolsa & Readecuación)
CREATE TABLE IF NOT EXISTS transferencias_areas (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  account_code TEXT NOT NULL,
  source_area TEXT NOT NULL,
  target_area TEXT NOT NULL,
  amount_clp NUMERIC NOT NULL,
  reason TEXT,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_items_project ON items_gasto(project_id);
CREATE INDEX IF NOT EXISTS idx_items_account ON items_gasto(account_code);
CREATE INDEX IF NOT EXISTS idx_apre_cuenta ON apre_presupuesto_aprobado(codigo_cuenta);
CREATE INDEX IF NOT EXISTS idx_proyectos_area ON proyectos(area);
CREATE INDEX IF NOT EXISTS idx_proyectos_status ON proyectos(execution_status);
`;
