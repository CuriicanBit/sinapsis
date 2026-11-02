import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { Project, BudgetItem, ApreApprovedRecord, AreaTransfer, Area } from '../types/budget';
import { INITIAL_PROJECTS } from '../data/mockData';
import { REAL_APRE_APPROVED_TALCA_2026 } from '../data/realApreApproved2026';

// Map DB row to TypeScript Project
export function mapRowToProject(row: any, items: BudgetItem[]): Project {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    area: row.area,
    responsible: row.responsible,
    estimatedStartMonth: Number(row.estimated_start_month) || 1,
    justification: row.justification || '',
    reviewStatus: row.review_status || 'En Revisión',
    directorNotes: row.director_notes || '',
    items: items || [],
    requestedBudgetCLP: Number(row.requested_budget_clp) || 0,
    approvedCeilingCLP: row.approved_ceiling_clp !== null ? Number(row.approved_ceiling_clp) : undefined,
    executedBudgetCLP: Number(row.executed_budget_clp) || 0,
    progressPercentage: Number(row.progress_percentage) || 0,
    executionStatus: row.execution_status || 'No Iniciado',
    isExtrapresupuestario: Boolean(row.is_extrapresupuestario),
    pausedInPostCut: Boolean(row.paused_in_post_cut),
    bitacora: [],
    apreCodigoPres: row.apre_codigo_pres || undefined,
  };
}

// Map DB row to BudgetItem
export function mapRowToItem(row: any): BudgetItem {
  return {
    id: row.id,
    description: row.description || '',
    justification: row.justification || '',
    quantity: Number(row.quantity) || 1,
    unitPriceCLP: Number(row.unit_price_clp) || 0,
    totalPriceCLP: Number(row.total_price_clp) || 0,
    accountCode: row.account_code || undefined,
  };
}

// ==========================================
// 1. PROYECTOS & ITEMS (Etapa 1 & 2)
// ==========================================

export async function fetchProjectsFromDatabase(): Promise<Project[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: projectRows, error: projError } = await supabase
      .from('proyectos')
      .select('*')
      .order('code', { ascending: true });

    if (projError) {
      console.warn('Error fetching proyectos from Supabase:', projError.message);
      return null;
    }

    if (!projectRows || projectRows.length === 0) {
      // If table exists but is empty, seed it with the initial departmental projects
      console.log('Tabla proyectos vacía en Supabase. Sembrando datos iniciales...');
      await seedInitialProjectsToSupabase();
      return INITIAL_PROJECTS;
    }

    // Fetch all items
    const { data: itemRows, error: itemsError } = await supabase
      .from('items_gasto')
      .select('*');

    if (itemsError) {
      console.warn('Error fetching items_gasto from Supabase:', itemsError.message);
    }

    const itemsByProject = new Map<string, BudgetItem[]>();
    (itemRows || []).forEach((row) => {
      const it = mapRowToItem(row);
      const list = itemsByProject.get(row.project_id) || [];
      list.push(it);
      itemsByProject.set(row.project_id, list);
    });

    const projects: Project[] = projectRows.map((pRow) => {
      const items = itemsByProject.get(pRow.id) || [];
      return mapRowToProject(pRow, items);
    });

    return projects;
  } catch (e) {
    console.warn('Exception during fetchProjectsFromDatabase:', e);
    return null;
  }
}

export async function insertProjectIntoDatabase(project: Project): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    // 1. Insert into proyectos
    const { error: projError } = await supabase.from('proyectos').insert({
      id: project.id,
      code: project.code,
      title: project.title,
      area: project.area,
      responsible: project.responsible,
      estimated_start_month: project.estimatedStartMonth,
      justification: project.justification,
      review_status: project.reviewStatus,
      director_notes: project.directorNotes || '',
      requested_budget_clp: project.requestedBudgetCLP,
      approved_ceiling_clp: project.approvedCeilingCLP ?? project.requestedBudgetCLP,
      executed_budget_clp: project.executedBudgetCLP || 0,
      progress_percentage: project.progressPercentage || 0,
      execution_status: project.executionStatus || 'No Iniciado',
      is_extrapresupuestario: project.isExtrapresupuestario || false,
      paused_in_post_cut: project.pausedInPostCut || false,
      apre_codigo_pres: project.apreCodigoPres || null,
      updated_at: new Date().toISOString(),
    });

    if (projError) {
      console.error('Error inserting project into Supabase:', projError);
      return false;
    }

    // 2. Insert items
    if (project.items.length > 0) {
      const itemRows = project.items.map((it) => ({
        id: it.id,
        project_id: project.id,
        description: it.description,
        justification: it.justification || '',
        quantity: it.quantity,
        unit_price_clp: it.unitPriceCLP,
        total_price_clp: it.totalPriceCLP,
        account_code: it.accountCode || null,
      }));

      const { error: itemsError } = await supabase.from('items_gasto').insert(itemRows);
      if (itemsError) {
        console.error('Error inserting items_gasto into Supabase:', itemsError);
      }
    }

    return true;
  } catch (e) {
    console.error('Exception inserting project:', e);
    return false;
  }
}

export async function updateProjectInDatabase(project: Project): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    // 1. Update project header
    const { error: projError } = await supabase
      .from('proyectos')
      .update({
        title: project.title,
        area: project.area,
        responsible: project.responsible,
        estimated_start_month: project.estimatedStartMonth,
        justification: project.justification,
        review_status: project.reviewStatus,
        director_notes: project.directorNotes || '',
        requested_budget_clp: project.requestedBudgetCLP,
        approved_ceiling_clp: project.approvedCeilingCLP ?? project.requestedBudgetCLP,
        executed_budget_clp: project.executedBudgetCLP,
        progress_percentage: project.progressPercentage,
        execution_status: project.executionStatus,
        paused_in_post_cut: project.pausedInPostCut || false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    if (projError) {
      console.error('Error updating project in Supabase:', projError);
      return false;
    }

    // 2. Sync items: delete removed items and upsert active ones
    const currentItemIds = project.items.map((i) => i.id);

    // Delete items not in current list
    await supabase
      .from('items_gasto')
      .delete()
      .eq('project_id', project.id)
      .not('id', 'in', `(${currentItemIds.map((id) => `"${id}"`).join(',')})`);

    // Upsert items
    if (project.items.length > 0) {
      const itemRows = project.items.map((it) => ({
        id: it.id,
        project_id: project.id,
        description: it.description,
        justification: it.justification || '',
        quantity: it.quantity,
        unit_price_clp: it.unitPriceCLP,
        total_price_clp: it.totalPriceCLP,
        account_code: it.accountCode || null,
      }));

      const { error: upsertError } = await supabase
        .from('items_gasto')
        .upsert(itemRows, { onConflict: 'id' });

      if (upsertError) {
        console.error('Error upserting items into Supabase:', upsertError);
      }
    }

    return true;
  } catch (e) {
    console.error('Exception updating project:', e);
    return false;
  }
}

export async function deleteProjectFromDatabase(projectId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('proyectos').delete().eq('id', projectId);
    if (error) {
      console.error('Error deleting project from Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception deleting project:', e);
    return false;
  }
}

export async function updateItemAccountCodeInDatabase(itemId: string, accountCode?: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('items_gasto')
      .update({ account_code: accountCode || null })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating item account code in Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception updating item account code:', e);
    return false;
  }
}

// ==========================================
// 2. APRE PRESUPUESTO APROBADO (Etapa 3)
// ==========================================

export async function fetchApreRecordsFromDatabase(): Promise<ApreApprovedRecord[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('apre_presupuesto_aprobado')
      .select('*')
      .order('codigo_pres', { ascending: true });

    if (error) {
      console.warn('Error fetching APRE records from Supabase:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data.map((r) => ({
      distribucion: r.distribucion || '[2026] MARZO A NOVIEMBRE',
      codigoPres: r.codigo_pres,
      ano: r.ano || 2026,
      sucursal: r.sucursal || 'TALCA',
      codigoTipoCuenta: r.codigo_tipo_cuenta || '4',
      tipoCuenta: r.tipo_cuenta || 'ACTIVOS',
      codigoCentro: r.codigo_centro || '621007',
      centroCosto: r.centro_costo || 'INFORMÁTICA',
      codigoGrupoCuenta: r.codigo_grupo_cuenta || '1',
      grupoCuenta: r.grupo_cuenta || 'INVERSIÓN',
      codigoCuenta: r.codigo_cuenta,
      cuentaContable: r.cuenta_contable,
      codigoItem: r.codigo_item || '40404',
      itemCosto: r.item_costo || 'ITEM ACTIVO',
      detalle: r.detalle || '',
      justificacion: r.justificacion || '',
      cantidadDesc: r.cantidad_desc || '',
      montoTotal: Number(r.monto_total) || 0,
      montoEjecutado: Number(r.monto_ejecutado) || 0,
      saldo: Number(r.saldo) || 0,
      divisa: r.divisa || 'PESO CHILENO',
      ctaCorriente: r.cta_corriente || '44074221',
      usuarioCre: r.usuario_cre || '',
    }));
  } catch (e) {
    console.warn('Exception fetching APRE records from database:', e);
    return null;
  }
}

export async function saveApreRecordsToDatabase(records: ApreApprovedRecord[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const rows = records.map((r) => ({
      id: `apre-${r.codigoPres}`,
      codigo_pres: r.codigoPres,
      distribucion: r.distribucion,
      ano: r.ano,
      sucursal: r.sucursal,
      codigo_tipo_cuenta: r.codigoTipoCuenta,
      tipo_cuenta: r.tipoCuenta,
      codigo_centro: r.codigoCentro,
      centro_costo: r.centroCosto,
      codigo_grupo_cuenta: r.codigoGrupoCuenta,
      grupo_cuenta: r.grupoCuenta,
      codigo_cuenta: r.codigoCuenta,
      cuenta_contable: r.cuentaContable,
      codigo_item: r.codigoItem,
      item_costo: r.itemCosto,
      detalle: r.detalle,
      justificacion: r.justificacion,
      cantidad_desc: r.cantidadDesc,
      monto_total: r.montoTotal,
      monto_ejecutado: r.montoEjecutado,
      saldo: r.saldo,
      divisa: r.divisa,
      cta_corriente: r.ctaCorriente,
      usuario_cre: r.usuarioCre || '',
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('apre_presupuesto_aprobado')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Error saving APRE records to Supabase:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Exception saving APRE records to Supabase:', e);
    return false;
  }
}

// ==========================================
// 3. READECUACIÓN & PLAY (Etapa 4)
// ==========================================

export async function saveAreaTransferToDatabase(transfer: AreaTransfer): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('transferencias_areas').insert({
      id: transfer.id,
      date: transfer.date,
      account_code: transfer.accountCode,
      source_area: transfer.sourceArea,
      target_area: transfer.targetArea,
      amount_clp: transfer.amountCLP,
      reason: transfer.reason,
      author: transfer.author,
    });

    if (error) {
      console.error('Error inserting transfer into Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception inserting transfer into Supabase:', e);
    return false;
  }
}

export async function deleteAreaTransferFromDatabase(transferId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('transferencias_areas')
      .delete()
      .eq('id', transferId);

    if (error) {
      console.error('Error deleting transfer from Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception deleting transfer:', e);
    return false;
  }
}

export async function fetchAreaTransfersFromDatabase(): Promise<AreaTransfer[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('transferencias_areas')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Error fetching area transfers from Supabase:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      date: row.date,
      accountCode: row.account_code,
      sourceArea: row.source_area as Area,
      targetArea: row.target_area as Area,
      amountCLP: Number(row.amount_clp) || 0,
      reason: row.reason || '',
      author: row.author || '',
    }));
  } catch (e) {
    console.warn('Exception fetching area transfers from database:', e);
    return null;
  }
}

// Seed initial dataset to Supabase when first connected
export async function seedInitialProjectsToSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    for (const proj of INITIAL_PROJECTS) {
      await insertProjectIntoDatabase(proj);
    }
    console.log('Sembrado inicial de proyectos completado en Supabase.');
  } catch (e) {
    console.error('Error seeding initial projects to Supabase:', e);
  }
}

export async function seedInitialApreToSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await saveApreRecordsToDatabase(REAL_APRE_APPROVED_TALCA_2026);
    console.log('Sembrado inicial de APRE completado en Supabase.');
  } catch (e) {
    console.error('Error seeding APRE records to Supabase:', e);
  }
}
