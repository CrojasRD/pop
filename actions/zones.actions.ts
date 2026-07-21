'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { zoneSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

export async function createZone(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = { ...parsed.data, manager_id: parsed.data.manager_id || null };
  const { data, error } = await supabase.from('zones').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'zones', recordId: data.id, newValue: payload });
  revalidatePath('/zonas');
  revalidatePath('/usuarios');
  return { success: true };
}

export async function updateZone(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = zoneSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = { ...parsed.data, manager_id: parsed.data.manager_id || null };
  const { error } = await supabase.from('zones').update(payload).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'zones', recordId: id, newValue: payload });
  revalidatePath('/zonas');
  return { success: true };
}
