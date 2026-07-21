'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { acquisitionSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';
import type { AcquisitionStatus } from '@/lib/types';

export async function createAcquisitionRequest(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = acquisitionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  if (user.role === 'zonal_manager' && parsed.data.zone_id !== user.zone_id) {
    return { error: 'Solo puedes solicitar adquisición para tu propia zona' };
  }

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    store_id: parsed.data.store_id || null,
    related_event_id: parsed.data.related_event_id || null,
    attachment_url: parsed.data.attachment_url || null,
    requested_by: user.id,
    status: 'pending' as const
  };
  const { data, error } = await supabase.from('acquisition_requests').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'acquisition_requests', recordId: data.id, newValue: payload });
  revalidatePath('/adquisicion');
  return { success: true };
}

export async function reviewAcquisitionRequest(
  id: string,
  status: AcquisitionStatus,
  comment: string,
  extra?: { estimated_purchase_date?: string }
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = createClient();

  const payload: Record<string, unknown> = { status, admin_comment: comment };
  if (status === 'approved' || status === 'rejected') {
    payload.reviewed_by = admin.id;
    payload.reviewed_at = new Date().toISOString();
  }
  if (status === 'in_purchase' && extra?.estimated_purchase_date) {
    payload.estimated_purchase_date = extra.estimated_purchase_date;
  }
  if (status === 'received') {
    payload.received_at = new Date().toISOString();
  }

  const { error } = await supabase.from('acquisition_requests').update(payload).eq('id', id);
  if (error) return { error: error.message };

  const actionMap: Record<string, any> = { approved: 'approve', rejected: 'reject', in_purchase: 'update', received: 'update' };
  await logAudit({ action: actionMap[status] ?? 'update', module: 'acquisition_requests', recordId: id, newValue: payload });
  revalidatePath('/adquisicion');
  return { success: true };
}
