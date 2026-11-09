import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isSupabaseConfigured, getSupabaseClient } from './lib/supabase';
import { OFFICIAL_AREAS, OFFICIAL_TECHNICIANS } from './types/budget';
import { OFFICIAL_ACCOUNTS } from './utils/formatters';

export interface CuentaContable {
  code: string;
  name: string;
  type: 'Activo' | 'Gasto';
  category_label?: string;
  categoryLabel?: string;
  description?: string;
}

export interface Area {
  name: string;
  responsible?: string;
}

export interface Tecnico {
  name: string;
}

export interface CatalogContextType {
  cuentas: CuentaContable[];
  areas: Area[];
  tecnicos: Tecnico[];
  isLoading: boolean;
  refreshCatalogs: () => Promise<void>;
}

const FALLBACK_CUENTAS: CuentaContable[] = OFFICIAL_ACCOUNTS.map((acc) => ({
  code: acc.code,
  name: acc.name,
  type: acc.type,
  category_label: acc.categoryLabel,
  categoryLabel: acc.categoryLabel,
  description: acc.description,
}));

const FALLBACK_AREAS: Area[] = OFFICIAL_AREAS.map((a) => ({
  name: typeof a === 'string' ? a : (a as any).name,
  responsible: '',
}));

const FALLBACK_TECNICOS: Tecnico[] = OFFICIAL_TECHNICIANS.map((t) => ({
  name: typeof t === 'string' ? t : (t as any).name,
}));

const CatalogContext = createContext<CatalogContextType>({
  cuentas: FALLBACK_CUENTAS,
  areas: FALLBACK_AREAS,
  tecnicos: FALLBACK_TECNICOS,
  isLoading: true,
  refreshCatalogs: async () => {},
});

export const CatalogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cuentas, setCuentas] = useState<CuentaContable[]>(FALLBACK_CUENTAS);
  const [areas, setAreas] = useState<Area[]>(FALLBACK_AREAS);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>(FALLBACK_TECNICOS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCatalogs = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const [cuentasRes, areasRes, tecnicosRes] = await Promise.all([
        supabase.from('cuentas_contables').select('*').order('code', { ascending: true }),
        supabase.from('areas').select('*').order('name', { ascending: true }),
        supabase.from('tecnicos').select('*').order('name', { ascending: true }),
      ]);

      if (cuentasRes.data && cuentasRes.data.length > 0) {
        setCuentas(
          cuentasRes.data.map((row: any) => ({
            code: String(row.code || ''),
            name: row.name || '',
            type: (row.type === 'Activo' ? 'Activo' : 'Gasto') as 'Activo' | 'Gasto',
            category_label: row.category_label || row.categoryLabel || (row.type === 'Activo' ? 'Inversión' : 'Operación'),
            categoryLabel: row.category_label || row.categoryLabel || (row.type === 'Activo' ? 'Inversión' : 'Operación'),
            description: row.description || '',
          }))
        );
      }

      if (areasRes.data && areasRes.data.length > 0) {
        setAreas(
          areasRes.data.map((row: any) => ({
            name: row.name,
            responsible: row.responsible || '',
          }))
        );
      }

      if (tecnicosRes.data && tecnicosRes.data.length > 0) {
        setTecnicos(
          tecnicosRes.data.map((row: any) => ({
            name: row.name,
          }))
        );
      }
    } catch (err) {
      console.warn('Error al cargar catálogos desde Supabase, usando valores por defecto:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  return (
    <CatalogContext.Provider
      value={{
        cuentas,
        areas,
        tecnicos,
        isLoading,
        refreshCatalogs: fetchCatalogs,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => useContext(CatalogContext);
