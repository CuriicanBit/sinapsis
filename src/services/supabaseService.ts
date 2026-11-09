import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { Project, BudgetItem, ApreApprovedRecord, AreaTransfer, Area, ProjectMilestone, HitoProyecto } from '../types/budget';
import { INITIAL_PROJECTS } from '../data/mockData';
import { REAL_APRE_APPROVED_TALCA_2026 } from '../data/realApreApproved2026';

// Map DB row to TypeScript Project
export function mapRowToProject(row: any, items: BudgetItem[]): Project {
  let fy = Number(row.fiscal_year);
  if (isNaN(fy) || fy <= 0) {
    if (row.code && typeof row.code === 'string') {
      const match = row.code.match(/TIC-TAL-(\d{4})/i);
      if (match && match[1]) {
        fy = parseInt(match[1], 10);
      } else {
        fy = 2026;
      }
    } else {
      fy = 2026;
    }
  }

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
    fiscalYear: fy,
    reportedToApre: Boolean(row.reported_to_apre),
    especificacionesTecnicas: row.especificaciones_tecnicas || undefined,
    proveedorAdjudicado: row.proveedor_adjudicado || undefined,
    recepcionOk: Boolean(row.recepcion_ok),
    enviadoAPago: Boolean(row.enviado_a_pago),
    destino: row.destino || undefined,
    unidadFinanciadora: row.unidad_financiadora || undefined,
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
    aprePresCodigo: row.apre_pres_codigo || undefined,
    apreApprovedCLP: row.apre_approved_clp !== null && row.apre_approved_clp !== undefined ? Number(row.apre_approved_clp) : undefined,
    montoCotizadoCLP: row.monto_cotizado_clp !== null && row.monto_cotizado_clp !== undefined ? Number(row.monto_cotizado_clp) : undefined,
    montoEjecutadoFinalCLP: row.monto_ejecutado_final_clp !== null && row.monto_ejecutado_final_clp !== undefined ? Number(row.monto_ejecutado_final_clp) : undefined,
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

// Cache of columns detected to be missing in the remote Supabase schema
const missingColumnsByTable: Map<string, Set<string>> = new Map();

function markColumnAsMissing(table: string, column: string) {
  let cols = missingColumnsByTable.get(table);
  if (!cols) {
    cols = new Set<string>();
    missingColumnsByTable.set(table, cols);
  }
  cols.add(column);
}

function sanitizePayload(table: string, obj: Record<string, any>): Record<string, any> {
  const missing = missingColumnsByTable.get(table);
  if (!missing || missing.size === 0) return { ...obj };
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (!missing.has(key)) {
      clean[key] = val;
    }
  }
  return clean;
}

function extractMissingColumn(error: any): string | null {
  if (!error) return null;
  const msg = typeof error.message === 'string' ? error.message : '';
  const match = msg.match(/Could not find the '([^']+)' column/i);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

async function resilientUpdate(
  supabase: any,
  table: string,
  payload: Record<string, any>,
  matchField: string,
  matchValue: any,
  maxRetries = 5
): Promise<{ error: any }> {
  let currentPayload = sanitizePayload(table, payload);
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { error } = await supabase
      .from(table)
      .update(currentPayload)
      .eq(matchField, matchValue);

    if (!error) return { error: null };

    if (error.code === 'PGRST204' || (error.message && error.message.includes('column') && error.message.includes('schema cache'))) {
      const missingCol = extractMissingColumn(error);
      if (missingCol && missingCol in currentPayload) {
        console.warn(`[Supabase Fallback] Columna '${missingCol}' no existe en tabla '${table}'. Omitiendo y reintentando actualización...`);
        markColumnAsMissing(table, missingCol);
        delete currentPayload[missingCol];
        continue;
      }
    }
    return { error };
  }
  return { error: new Error(`No se pudo actualizar '${table}' tras varios reintentos.`) };
}

async function resilientInsert(
  supabase: any,
  table: string,
  payload: Record<string, any> | Record<string, any>[],
  maxRetries = 5
): Promise<{ error: any }> {
  const isArray = Array.isArray(payload);
  let currentPayload = isArray
    ? payload.map((row) => sanitizePayload(table, row))
    : sanitizePayload(table, payload);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { error } = await supabase.from(table).insert(currentPayload);
    if (!error) return { error: null };

    if (error.code === 'PGRST204' || (error.message && error.message.includes('column') && error.message.includes('schema cache'))) {
      const missingCol = extractMissingColumn(error);
      if (missingCol) {
        console.warn(`[Supabase Fallback] Columna '${missingCol}' no existe en tabla '${table}'. Omitiendo y reintentando inserción...`);
        markColumnAsMissing(table, missingCol);
        if (Array.isArray(currentPayload)) {
          currentPayload = currentPayload.map((row) => {
            const next = { ...row };
            delete next[missingCol];
            return next;
          });
        } else {
          delete currentPayload[missingCol];
        }
        continue;
      }
    }
    return { error };
  }
  return { error: new Error(`No se pudo insertar en '${table}' tras varios reintentos.`) };
}

async function resilientUpsert(
  supabase: any,
  table: string,
  payload: Record<string, any>[],
  options: { onConflict: string },
  maxRetries = 5
): Promise<{ error: any }> {
  let currentPayload = payload.map((row) => sanitizePayload(table, row));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { error } = await supabase.from(table).upsert(currentPayload, options);
    if (!error) return { error: null };

    if (error.code === 'PGRST204' || (error.message && error.message.includes('column') && error.message.includes('schema cache'))) {
      const missingCol = extractMissingColumn(error);
      if (missingCol) {
        console.warn(`[Supabase Fallback] Columna '${missingCol}' no existe en tabla '${table}'. Omitiendo y reintentando upsert...`);
        markColumnAsMissing(table, missingCol);
        currentPayload = currentPayload.map((row) => {
          const next = { ...row };
          delete next[missingCol];
          return next;
        });
        continue;
      }
    }
    return { error };
  }
  return { error: new Error(`No se pudo hacer upsert en '${table}' tras varios reintentos.`) };
}

export async function insertProjectIntoDatabase(project: Project): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    // 1. Insert into proyectos
    const { error: projError } = await resilientInsert(supabase, 'proyectos', {
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
      fiscal_year: project.fiscalYear || 2026,
      reported_to_apre: project.reportedToApre || false,
      especificaciones_tecnicas: project.especificacionesTecnicas || null,
      proveedor_adjudicado: project.proveedorAdjudicado || null,
      recepcion_ok: Boolean(project.recepcionOk),
      enviado_a_pago: Boolean(project.enviadoAPago),
      destino: project.destino || null,
      unidad_financiadora: project.unidadFinanciadora || null,
      updated_at: new Date().toISOString(),
    });

    if (projError) {
      console.warn('Error inserting project into Supabase:', projError);
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
        apre_pres_codigo: it.aprePresCodigo || null,
        apre_approved_clp: it.apreApprovedCLP ?? 0,
        monto_cotizado_clp: it.montoCotizadoCLP ?? null,
        monto_ejecutado_final_clp: it.montoEjecutadoFinalCLP ?? null,
      }));

      const { error: itemsError } = await resilientInsert(supabase, 'items_gasto', itemRows);
      if (itemsError) {
        console.warn('Error inserting items_gasto into Supabase:', itemsError);
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
    const { error: projError } = await resilientUpdate(
      supabase,
      'proyectos',
      {
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
        reported_to_apre: project.reportedToApre || false,
        especificaciones_tecnicas: project.especificacionesTecnicas || null,
        proveedor_adjudicado: project.proveedorAdjudicado || null,
        recepcion_ok: Boolean(project.recepcionOk),
        enviado_a_pago: Boolean(project.enviadoAPago),
        destino: project.destino || null,
        unidad_financiadora: project.unidadFinanciadora || null,
        updated_at: new Date().toISOString(),
      },
      'id',
      project.id
    );

    if (projError) {
      console.warn('Error updating project in Supabase:', projError);
      return false;
    }

    // 2. Sync items: delete removed items and upsert active ones
    const currentItemIds = project.items.map((i) => i.id);

    // Delete items not in current list
    if (currentItemIds.length > 0) {
      await supabase
        .from('items_gasto')
        .delete()
        .eq('project_id', project.id)
        .not('id', 'in', `(${currentItemIds.map((id) => `"${id}"`).join(',')})`);
    }

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
        apre_pres_codigo: it.aprePresCodigo || null,
        apre_approved_clp: it.apreApprovedCLP ?? 0,
        monto_cotizado_clp: it.montoCotizadoCLP ?? null,
        monto_ejecutado_final_clp: it.montoEjecutadoFinalCLP ?? null,
      }));

      const { error: upsertError } = await resilientUpsert(
        supabase,
        'items_gasto',
        itemRows,
        { onConflict: 'id' }
      );

      if (upsertError) {
        console.warn('Warning upserting items into Supabase:', upsertError);
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

export async function fetchApreRecordsFromDatabase(fiscalYear?: number): Promise<ApreApprovedRecord[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    let query = supabase
      .from('apre_presupuesto_aprobado')
      .select('*')
      .order('codigo_pres', { ascending: true });

    if (fiscalYear) {
      query = query.eq('ano', fiscalYear);
    }

    const { data, error } = await query;

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
      excluded: Boolean(r.excluded),
      exclusionReason: r.exclusion_reason || undefined,
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
    const rows = records.map((r) => {
      // Generamos un ID único basado en el código PRES y el detalle (evita duplicados si cambia el orden)
      const safeId = `apre-${r.codigoPres}-${Math.abs((r.detalle || '').split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0))}`;

      return {
        id: safeId,
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
        excluded: r.excluded || false,
        exclusion_reason: r.exclusionReason || null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await resilientUpsert(
      supabase,
      'apre_presupuesto_aprobado',
      rows,
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('Error saving APRE records to Supabase:', error);
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
    const { error } = await resilientInsert(supabase, 'transferencias_areas', {
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
      console.warn('Error inserting transfer into Supabase:', error);
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

// ==========================================
// 4. LÍNEA DE TIEMPO DE HITOS (Etapa 5)
// ==========================================

const HITOS_STORAGE_PREFIX = 'sinapsis_hitos_';

function getLocalHitos(projectId: string): ProjectMilestone[] {
  try {
    const raw = localStorage.getItem(`${HITOS_STORAGE_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalHitos(projectId: string, hitos: ProjectMilestone[]) {
  try {
    localStorage.setItem(`${HITOS_STORAGE_PREFIX}${projectId}`, JSON.stringify(hitos));
  } catch (e) {
    // ignore
  }
}

export async function fetchHitosForProject(projectId: string): Promise<ProjectMilestone[]> {
  const local = getLocalHitos(projectId);
  const supabase = getSupabaseClient();
  if (!supabase) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('hitos_proyecto')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: true });

    if (error) {
      console.warn(`[Supabase] No se pudieron cargar hitos de ${projectId}:`, error.message);
      return local;
    }

    if (data && data.length > 0) {
      const mapped: ProjectMilestone[] = data.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        date: row.date,
        description: row.description || '',
        completed: Boolean(row.completed),
      }));
      saveLocalHitos(projectId, mapped);
      return mapped;
    }

    return local;
  } catch (e) {
    console.warn('[Supabase] Excepción en fetchHitosForProject:', e);
    return local;
  }
}

export async function insertHito(hito: any): Promise<ProjectMilestone | null> {
  const projId = hito.projectId || hito.project_id;
  const newHito: ProjectMilestone = {
    id: hito.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hito-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    projectId: projId,
    title: hito.title,
    date: hito.date,
    description: hito.description || '',
    completed: Boolean(hito.completed),
  };

  if (projId) {
    const local = getLocalHitos(projId);
    saveLocalHitos(projId, [...local, newHito]);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return newHito;
  }

  try {
    const { data, error } = await supabase
      .from('hitos_proyecto')
      .insert([{
        id: newHito.id.startsWith('hito-') ? undefined : newHito.id,
        project_id: newHito.projectId,
        title: newHito.title,
        date: newHito.date,
        description: newHito.description || null,
        completed: newHito.completed,
      }])
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] Error insertando hito en BD:', error.message);
      return newHito;
    }

    if (data) {
      const persisted: ProjectMilestone = {
        id: data.id,
        projectId: data.project_id,
        title: data.title,
        date: data.date,
        description: data.description || '',
        completed: Boolean(data.completed),
      };
      if (projId) {
        const local = getLocalHitos(projId).filter((h) => h.id !== newHito.id);
        saveLocalHitos(projId, [...local, persisted]);
      }
      return persisted;
    }

    return newHito;
  } catch (e) {
    console.warn('[Supabase] Excepción insertando hito:', e);
    return newHito;
  }
}

export async function updateHito(hito: any): Promise<boolean> {
  const projId = hito.projectId || hito.project_id;
  if (projId) {
    const local = getLocalHitos(projId);
    saveLocalHitos(
      projId,
      local.map((h) =>
        h.id === hito.id
          ? {
              ...h,
              title: hito.title,
              date: hito.date,
              description: hito.description || '',
              completed: Boolean(hito.completed),
            }
          : h
      )
    );
  }

  const supabase = getSupabaseClient();
  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from('hitos_proyecto')
      .update({
        title: hito.title,
        date: hito.date,
        description: hito.description || null,
        completed: Boolean(hito.completed),
      })
      .eq('id', hito.id);

    if (error) {
      console.warn('[Supabase] Error actualizando hito:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Excepción actualizando hito:', e);
    return false;
  }
}

export async function deleteHito(hitoId: string, projectId?: string): Promise<boolean> {
  if (projectId) {
    const local = getLocalHitos(projectId);
    saveLocalHitos(projectId, local.filter((h) => h.id !== hitoId));
  } else {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(HITOS_STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: ProjectMilestone[] = JSON.parse(raw);
            if (list.some((h) => h.id === hitoId)) {
              localStorage.setItem(key, JSON.stringify(list.filter((h) => h.id !== hitoId)));
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const supabase = getSupabaseClient();
  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from('hitos_proyecto')
      .delete()
      .eq('id', hitoId);

    if (error) {
      console.warn('[Supabase] Error eliminando hito:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Excepción eliminando hito:', e);
    return false;
  }
}

