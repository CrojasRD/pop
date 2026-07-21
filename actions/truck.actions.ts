'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { truckStopSchema, truckStopBaseSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

// El cronograma del camión lo administra únicamente el Administrador.
// Los jefes zonales solo tienen acceso de lectura (impuesto también por RLS).

export async function createTruckStop(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = truckStopSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    notes: parsed.data.notes || null,
    status: 'scheduled' as const,
    created_by: admin.id
  };

  const { data, error } = await supabase.from('truck_schedule').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'truck_schedule', recordId: data.id, newValue: payload });
  revalidatePath('/camion');
  return { success: true };
}

export async function updateTruckStop(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();

  const { data: existing } = await supabase.from('truck_schedule').select('*').eq('id', id).single();
  if (!existing) return { error: 'Actividad no encontrada' };

  const parsed = truckStopBaseSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const payload = { ...parsed.data, notes: parsed.data.notes ?? existing.notes };
  const { error } = await supabase.from('truck_schedule').update(payload).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'truck_schedule', recordId: id, oldValue: existing, newValue: payload });
  revalidatePath('/camion');
  return { success: true };
}

export async function cancelTruckStop(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('truck_schedule').update({ status: 'cancelled' }).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'truck_schedule', recordId: id, newValue: { status: 'cancelled' } });
  revalidatePath('/camion');
  return { success: true };
}

export async function deleteTruckStop(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('truck_schedule').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'delete', module: 'truck_schedule', recordId: id });
  revalidatePath('/camion');
  return { success: true };
}
