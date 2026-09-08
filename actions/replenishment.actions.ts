'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { replenishmentSchema, replenishmentApprovalSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

export async function createReplenishmentRequest(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = replenishmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const { store_ids, ...rest } = parsed.data;

  // La zona de cada solicitud se toma de la propia joyería, no se pide aparte
  // en el formulario. RLS en `stores` ya limita lo que un jefe zonal puede
  // leer a su propia zona, así que si pidió una joyería fuera de su zona
  // simplemente no vendrá en `storesData` y se detecta abajo.
  const { data: storesData, error: storesError } = await supabase.from('stores').select('id, zone_id').in('id', store_ids);
  if (storesError) return { error: storesError.message };
  if (!storesData || storesData.length !== store_ids.length) {
    return { error: 'Una o más joyerías no son válidas o no tienes acceso a ellas' };
  }

  const payloads = storesData.map((s) => ({ ...rest, store_id: s.id, zone_id: s.zone_id, requested_by: user.id, status: 'pending' as const }));
  const { data, error } = await supabase.from('replenishment_requests').insert(payloads).select('id');
  if (error) return { error: error.message };

  for (const row of data ?? []) {
    await logAudit({ action: 'create', module: 'replenishment_requests', recordId: row.id, newValue: rest });
  }
  revalidatePath('/reposicion');
  return { success: true };
}

export async function reviewReplenishmentRequest(
  id: string,
  decision: 'approved' | 'rejected',
  comment: string,
  quantity?: number
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = createClient();

  const payload: Record<string, unknown> = {
    status: decision,
    admin_comment: comment,
    reviewed_by: admin.id,
    reviewed_at: new Date().toISOString()
  };

  // La cantidad solo la define el administrador, y únicamente al aprobar
  // (el jefe zonal nunca la propone al crear la solicitud).
  if (decision === 'approved') {
    const parsed = replenishmentApprovalSchema.safeParse({ requested_quantity: quantity });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Indica la cantidad a aprobar' };
    payload.requested_quantity = parsed.data.requested_quantity;
  }

  const { error } = await supabase.from('replenishment_requests').update(payload).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: decision === 'approved' ? 'approve' : 'reject', module: 'replenishment_requests', recordId: id, newValue: { comment, quantity: payload.requested_quantity } });
  revalidatePath('/reposicion');
  return { success: true };
}

export async function deliverReplenishmentRequest(id: string, notes?: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.rpc('deliver_replenishment', { p_request_id: id, p_notes: notes ?? null });
  if (error) return { error: error.message };

  revalidatePath('/reposicion');
  revalidatePath('/inventario');
  return { success: true };
}
