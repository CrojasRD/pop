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

  if (user.role === 'zonal_manager' && parsed.data.zone_id !== user.zone_id) {
    return { error: 'Solo puedes solicitar reposición para tu propia zona' };
  }

  const supabase = createClient();
  const payload = { ...parsed.data, requested_by: user.id, status: 'pending' as const };
  const { data, error } = await supabase.from('replenishment_requests').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'replenishment_requests', recordId: data.id, newValue: payload });
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
