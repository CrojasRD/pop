'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { eventSchema, eventBaseSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';
import type { EventImportRow } from '@/lib/import';

export async function createEvent(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  if (user.role === 'zonal_manager' && parsed.data.zone_id !== user.zone_id) {
    return { error: 'Solo puedes crear eventos para tu propia zona' };
  }

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    store_id: parsed.data.store_id || null,
    zonal_manager_id: user.role === 'zonal_manager' ? user.id : null,
    status: 'pending' as const,
    created_by: user.id
  };

  const { data, error } = await supabase.from('events').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'events', recordId: data.id, newValue: payload });
  revalidatePath('/eventos');
  return { success: true };
}

export async function updateEvent(id: string, input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: existing } = await supabase.from('events').select('*').eq('id', id).single();
  if (!existing) return { error: 'Evento no encontrado' };
  if (user.role !== 'admin' && (existing.created_by !== user.id || existing.status !== 'pending')) {
    return { error: 'Solo puedes editar tus propios eventos mientras estén pendientes' };
  }

  const parsed = eventBaseSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const payload = { ...parsed.data, store_id: parsed.data.store_id || null };
  const { error } = await supabase.from('events').update(payload).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'events', recordId: id, oldValue: existing, newValue: payload });
  revalidatePath('/eventos');
  return { success: true };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  // Importante: sin `.select()`, Supabase/RLS no informa si el delete realmente
  // afectó alguna fila — si la política bloquea el borrado, responde "éxito"
  // sin haber borrado nada. Pedimos las filas eliminadas para poder detectarlo.
  const { error, data } = await supabase.from('events').delete().eq('id', id).select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'No se pudo eliminar el evento. Verifica que tengas permisos de administrador o que el evento todavía exista.' };
  }

  await logAudit({ action: 'delete', module: 'events', recordId: id });
  revalidatePath('/eventos');
  return { success: true };
}

export async function reviewEvent(id: string, decision: 'approved' | 'rejected', comment: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from('events')
    .update({ status: decision, admin_comment: comment, approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: decision === 'approved' ? 'approve' : 'reject', module: 'events', recordId: id, newValue: { comment } });
  revalidatePath('/eventos');
  return { success: true };
}

export async function bulkImportEvents(
  rows: EventImportRow[],
  createdBy: string
): Promise<ActionResult & { imported?: number }> {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: zones }, { data: stores }] = await Promise.all([
    supabase.from('zones').select('id, name'),
    supabase.from('stores').select('id, name, zone_id')
  ]);
  const zoneMap = new Map((zones ?? []).map((z: any) => [z.name.toLowerCase(), z.id]));
  const storeMap = new Map((stores ?? []).map((s: any) => [s.name.toLowerCase(), s]));

  const payload = rows.map((r) => {
    const store = storeMap.get(r.store_name.toLowerCase());
    return {
      event_name: r.event_name,
      start_date: r.start_date,
      end_date: r.end_date,
      start_time: r.start_time || null,
      end_time: r.end_time || null,
      city: r.city || null,
      province: r.province || null,
      location: r.location || null,
      store_id: store?.id ?? null,
      zone_id: zoneMap.get(r.zone_name.toLowerCase()) ?? null,
      event_type: r.event_type || null,
      description: r.description || null,
      justification: r.justification || null,
      status: 'pending' as const,
      created_by: createdBy
    };
  });

  const { error, count } = await supabase.from('events').insert(payload, { count: 'exact' });
  if (error) return { error: error.message };

  await logAudit({ action: 'bulk_upload', module: 'events', newValue: { count: payload.length } });
  revalidatePath('/eventos');
  return { success: true, imported: count ?? payload.length };
}
