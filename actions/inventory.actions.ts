'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { popItemSchema, popAvailabilitySchema } from '@/lib/validations';
import type { PopItemImportRow, AssignmentImportRow, AssignmentUpdateImportRow } from '@/lib/import';

export interface ActionResult {
  success?: boolean;
  error?: string;
}

export async function createPopItem(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = popItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const supabase = createClient();
  const { data: userRes } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('pop_items')
    .insert({
      ...parsed.data,
      warehouse_quantity: parsed.data.total_quantity,
      created_by: userRes.user?.id
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'pop_items', recordId: data.id, newValue: parsed.data });
  revalidatePath('/inventario');
  return { success: true };
}

export async function updatePopItem(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = popItemSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('pop_items').update(parsed.data).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'pop_items', recordId: id, newValue: parsed.data });
  revalidatePath('/inventario');
  revalidatePath(`/inventario/${id}`);
  return { success: true };
}

export async function updatePopItemAvailability(id: string, isAvailable: boolean): Promise<ActionResult> {
  await requireAdmin();
  const parsed = popAvailabilitySchema.safeParse({ is_available: isAvailable });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const { error } = await supabase.from('pop_items').update(parsed.data).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'pop_items', recordId: id, newValue: parsed.data });
  revalidatePath('/inventario');
  revalidatePath(`/inventario/${id}`);
  return { success: true };
}

export async function deactivatePopItem(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('pop_items').update({ status: 'decommissioned' }).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'delete', module: 'pop_items', recordId: id });
  revalidatePath('/inventario');
  return { success: true };
}

export async function assignPopItemToStore(input: {
  popItemId: string;
  storeId: string;
  quantity: number;
  deliveryDate: string;
  notes?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.rpc('assign_pop_item', {
    p_pop_item_id: input.popItemId,
    p_store_id: input.storeId,
    p_quantity: input.quantity,
    p_delivery_date: input.deliveryDate,
    p_notes: input.notes ?? null
  });
  if (error) return { error: error.message };

  revalidatePath('/inventario');
  revalidatePath(`/inventario/${input.popItemId}`);
  return { success: true };
}

/**
 * Actualiza el estado físico y/o la cantidad registrada de un material ya
 * asignado a una joyería (ej. "tenemos 15, no 20" o "está dañado"). A
 * diferencia de assignPopItemToStore/returnPopItem, esto NO mueve stock de
 * bodega ni recalcula los agregados de pop_items — es una corrección del
 * registro en campo. Lo puede hacer el administrador o el jefe zonal de la
 * zona de esa joyería (reforzado también por RLS).
 */
export async function updateAssignmentDetail(
  assignmentId: string,
  input: { status?: string; assigned_quantity?: number; notes?: string }
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: existing } = await supabase.from('inventory_assignments').select('*').eq('id', assignmentId).single();
  if (!existing) return { error: 'Registro no encontrado' };
  if (user.role === 'zonal_manager' && existing.zone_id !== user.zone_id) {
    return { error: 'Solo puedes modificar el inventario de tu propia zona' };
  }
  if (input.assigned_quantity !== undefined && input.assigned_quantity < 0) {
    return { error: 'La cantidad no puede ser negativa' };
  }

  const payload: Record<string, unknown> = {};
  if (input.status !== undefined) payload.status = input.status;
  if (input.assigned_quantity !== undefined) payload.assigned_quantity = input.assigned_quantity;
  if (input.notes !== undefined) payload.notes = input.notes || null;

  const { error } = await supabase.from('inventory_assignments').update(payload).eq('id', assignmentId);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'inventory_assignments', recordId: assignmentId, oldValue: existing, newValue: payload });
  revalidatePath('/joyerias');
  revalidatePath(`/joyerias/${existing.store_id}`);
  return { success: true };
}

/**
 * Establece el estado de un material para una joyería desde la vista
 * "Control por zona". Si ya existe la asignación, solo actualiza el estado
 * (admin o jefe zonal de esa zona, según RLS). Si la joyería todavía no
 * "cuenta" con ese material, crea la asignación — esto sí mueve stock de
 * bodega, así que queda restringido a admin (misma regla que assign_pop_item).
 */
export async function setAssignmentStatus(input: {
  storeId: string;
  popItemId: string;
  status: string;
}): Promise<ActionResult & { assignmentId?: string }> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: store } = await supabase.from('stores').select('id, zone_id').eq('id', input.storeId).single();
  if (!store) return { error: 'Joyería no encontrada' };
  if (user.role === 'zonal_manager' && store.zone_id !== user.zone_id) {
    return { error: 'Solo puedes modificar el inventario de tu propia zona' };
  }

  const { data: existing } = await supabase
    .from('inventory_assignments')
    .select('id')
    .eq('pop_item_id', input.popItemId)
    .eq('store_id', input.storeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('inventory_assignments').update({ status: input.status }).eq('id', existing.id);
    if (error) return { error: error.message };
    await logAudit({ action: 'update', module: 'inventory_assignments', recordId: existing.id, newValue: { status: input.status } });
    revalidatePath('/joyerias');
    revalidatePath('/inventario');
    return { success: true, assignmentId: existing.id };
  }

  if (user.role !== 'admin') {
    return { error: 'Solo el administrador puede agregar este material a una joyería que aún no lo tiene' };
  }

  const { data: item } = await supabase.from('pop_items').select('id, warehouse_quantity, assigned_quantity').eq('id', input.popItemId).single();
  if (!item) return { error: 'Material no encontrado' };
  if (item.warehouse_quantity < 1) return { error: 'No hay stock en bodega para asignar este material' };

  const { data: created, error } = await supabase
    .from('inventory_assignments')
    .insert({
      pop_item_id: input.popItemId,
      store_id: input.storeId,
      zone_id: store.zone_id,
      assigned_quantity: 1,
      status: input.status,
      notes: 'Registrado desde Control por zona',
      created_by: user.id
    })
    .select('id')
    .single();
  if (error) return { error: error.message };

  await supabase
    .from('pop_items')
    .update({ warehouse_quantity: item.warehouse_quantity - 1, assigned_quantity: item.assigned_quantity + 1 })
    .eq('id', input.popItemId);

  await logAudit({ action: 'create', module: 'inventory_assignments', recordId: created.id, newValue: { status: input.status } });
  revalidatePath('/joyerias');
  revalidatePath('/inventario');
  return { success: true, assignmentId: created.id };
}

export async function returnPopItem(input: { assignmentId: string; quantity: number; notes?: string }): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.rpc('return_pop_item', {
    p_assignment_id: input.assignmentId,
    p_quantity: input.quantity,
    p_notes: input.notes ?? null
  });
  if (error) return { error: error.message };

  revalidatePath('/inventario');
  return { success: true };
}

export async function writeOffPopItem(input: {
  popItemId: string;
  quantity: number;
  from: 'warehouse' | 'assigned' | 'repair';
  notes?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.rpc('write_off_pop_item', {
    p_pop_item_id: input.popItemId,
    p_quantity: input.quantity,
    p_from: input.from,
    p_notes: input.notes ?? null
  });
  if (error) return { error: error.message };

  revalidatePath('/inventario');
  revalidatePath(`/inventario/${input.popItemId}`);
  return { success: true };
}

/** Carga masiva: recibe filas ya validadas en el cliente (validatePopItemRows) */
export async function bulkImportPopItems(rows: PopItemImportRow[]): Promise<ActionResult & { imported?: number }> {
  await requireAdmin();
  const supabase = createClient();

  const { data: categories } = await supabase.from('pop_categories').select('id, name');
  const categoryMap = new Map((categories ?? []).map((c: any) => [c.name.toLowerCase(), c.id]));

  const { data: userRes } = await supabase.auth.getUser();

  const payload = rows.map((r) => ({
    name: r.name,
    category_id: categoryMap.get(r.category.toLowerCase()) ?? null,
    description: r.description || null,
    internal_code: r.internal_code,
    total_quantity: r.total_quantity,
    warehouse_quantity: r.total_quantity,
    low_stock_threshold: r.low_stock_threshold,
    created_by: userRes.user?.id
  }));

  const { error, count } = await supabase.from('pop_items').insert(payload, { count: 'exact' });
  if (error) return { error: error.message };

  await logAudit({ action: 'bulk_upload', module: 'pop_items', newValue: { count: payload.length } });
  revalidatePath('/inventario');
  return { success: true, imported: count ?? payload.length };
}

/**
 * Carga masiva de distribución: asigna cantidades de materiales ya existentes
 * a joyerías (bodega -> joyería). Reutiliza la función transaccional
 * assign_pop_item por cada fila válida, así que respeta el mismo control de
 * stock disponible y deja rastro en inventory_movements y audit_logs.
 */
export async function bulkImportAssignments(
  rows: AssignmentImportRow[]
): Promise<ActionResult & { imported?: number; failed?: { row: AssignmentImportRow; error: string }[] }> {
  await requireAdmin();
  const supabase = createClient();

  const { data: items } = await supabase.from('pop_items').select('id, internal_code');
  const { data: stores } = await supabase.from('stores').select('id, code');
  const itemMap = new Map((items ?? []).map((i: any) => [i.internal_code, i.id]));
  const storeMap = new Map((stores ?? []).map((s: any) => [s.code, s.id]));

  let imported = 0;
  const failed: { row: AssignmentImportRow; error: string }[] = [];

  for (const row of rows) {
    const popItemId = itemMap.get(row.item_code);
    const storeId = storeMap.get(row.store_code);
    if (!popItemId || !storeId) {
      failed.push({ row, error: 'Material o joyería no encontrados' });
      continue;
    }
    const { error } = await supabase.rpc('assign_pop_item', {
      p_pop_item_id: popItemId,
      p_store_id: storeId,
      p_quantity: row.quantity,
      p_delivery_date: row.delivery_date,
      p_notes: row.notes || 'Carga masiva de distribución'
    });
    if (error) failed.push({ row, error: error.message });
    else imported++;
  }

  await logAudit({ action: 'bulk_upload', module: 'inventory', newValue: { imported, failed: failed.length } });
  revalidatePath('/inventario');
  return { success: true, imported, failed };
}

/**
 * Carga masiva de CAMBIOS: actualiza el estado y/o la cantidad de
 * asignaciones ya existentes (una fila por combinación joyería + material).
 * No mueve stock de bodega ni crea asignaciones nuevas — si la combinación
 * no existe todavía, la fila se reporta como fallida. Exclusivo de
 * administrador.
 */
export async function bulkUpdateAssignments(
  rows: AssignmentUpdateImportRow[]
): Promise<ActionResult & { updated?: number; failed?: { row: AssignmentUpdateImportRow; error: string }[] }> {
  await requireAdmin();
  const supabase = createClient();

  const { data: items } = await supabase.from('pop_items').select('id, internal_code');
  const { data: stores } = await supabase.from('stores').select('id, code');
  const itemMap = new Map((items ?? []).map((i: any) => [i.internal_code, i.id]));
  const storeMap = new Map((stores ?? []).map((s: any) => [s.code, s.id]));

  let updated = 0;
  const failed: { row: AssignmentUpdateImportRow; error: string }[] = [];

  for (const row of rows) {
    const popItemId = itemMap.get(row.item_code);
    const storeId = storeMap.get(row.store_code);
    if (!popItemId || !storeId) {
      failed.push({ row, error: 'Material o joyería no encontrados' });
      continue;
    }

    const { data: existing } = await supabase
      .from('inventory_assignments')
      .select('id')
      .eq('pop_item_id', popItemId)
      .eq('store_id', storeId)
      .maybeSingle();

    if (!existing) {
      failed.push({ row, error: 'Esa joyería aún no tiene ese material asignado' });
      continue;
    }

    const { error } = await supabase
      .from('inventory_assignments')
      .update({ status: row.status, assigned_quantity: row.quantity })
      .eq('id', existing.id);

    if (error) failed.push({ row, error: error.message });
    else updated++;
  }

  await logAudit({ action: 'bulk_upload', module: 'inventory_assignments', newValue: { updated, failed: failed.length } });
  revalidatePath('/joyerias');
  return { success: true, updated, failed };
}
