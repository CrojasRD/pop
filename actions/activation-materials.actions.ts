'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { activationMaterialSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

// El catálogo de materiales para activaciones lo gestiona solo el administrador;
// los jefes zonales únicamente lo consultan.

export async function createActivationMaterial(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = activationMaterialSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = {
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes || null,
    created_by: admin.id
  };

  const { data, error } = await supabase.from('activation_materials').insert(payload).select('id').single();
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un material con ese nombre' };
    return { error: error.message };
  }

  await logAudit({ action: 'create', module: 'activation_materials', recordId: data.id, newValue: payload });
  revalidatePath('/activaciones');
  return { success: true };
}

export async function updateActivationMaterial(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = activationMaterialSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = {
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes || null
  };

  const { data, error } = await supabase.from('activation_materials').update(payload).eq('id', id).select('id');
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un material con ese nombre' };
    return { error: error.message };
  }
  if (!data || data.length === 0) return { error: 'No se pudo actualizar el material.' };

  await logAudit({ action: 'update', module: 'activation_materials', recordId: id, newValue: payload });
  revalidatePath('/activaciones');
  return { success: true };
}

export async function deleteActivationMaterial(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  // Sin `.select()`, RLS no informa si el delete realmente afectó alguna fila.
  const { data, error } = await supabase.from('activation_materials').delete().eq('id', id).select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'No se pudo eliminar el material.' };

  await logAudit({ action: 'delete', module: 'activation_materials', recordId: id });
  revalidatePath('/activaciones');
  return { success: true };
}
