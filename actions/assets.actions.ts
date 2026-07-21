'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { assetSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

// Registro de ubicación / responsable / estado lo pueden hacer tanto el
// administrador como el jefe zonal (limitado a su propia zona). Solo el
// administrador puede eliminar un activo del registro.

export async function createAsset(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = assetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  if (user.role === 'zonal_manager' && parsed.data.zone_id !== user.zone_id) {
    return { error: 'Solo puedes registrar activos de tu propia zona' };
  }

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    store_id: parsed.data.store_id || null,
    location: parsed.data.location || null,
    responsible_name: parsed.data.responsible_name || null,
    notes: parsed.data.notes || null,
    created_by: user.id
  };

  const { data, error } = await supabase.from('assets').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'assets', recordId: data.id, newValue: payload });
  revalidatePath('/activos');
  return { success: true };
}

export async function updateAsset(id: string, input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: existing } = await supabase.from('assets').select('*').eq('id', id).single();
  if (!existing) return { error: 'Activo no encontrado' };
  if (user.role === 'zonal_manager' && existing.zone_id !== user.zone_id) {
    return { error: 'Solo puedes modificar activos de tu propia zona' };
  }

  const parsed = assetSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  // Un jefe zonal no puede reasignar un activo fuera de su zona.
  if (user.role === 'zonal_manager' && parsed.data.zone_id && parsed.data.zone_id !== user.zone_id) {
    return { error: 'No puedes mover un activo a otra zona' };
  }

  const payload = {
    ...parsed.data,
    store_id: parsed.data.store_id !== undefined ? parsed.data.store_id || null : undefined,
    location: parsed.data.location !== undefined ? parsed.data.location || null : undefined,
    responsible_name: parsed.data.responsible_name !== undefined ? parsed.data.responsible_name || null : undefined,
    notes: parsed.data.notes !== undefined ? parsed.data.notes || null : undefined
  };

  const { error } = await supabase.from('assets').update(payload).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'assets', recordId: id, oldValue: existing, newValue: payload });
  revalidatePath('/activos');
  return { success: true };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'delete', module: 'assets', recordId: id });
  revalidatePath('/activos');
  return { success: true };
}
