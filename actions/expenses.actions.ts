'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { expenseSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

// Gastos: módulo exclusivo de administrador.

export async function createExpense(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    supplier_id: parsed.data.supplier_id || null,
    zone_id: parsed.data.zone_id || null,
    notes: parsed.data.notes || null,
    created_by: admin.id
  };

  const { data, error } = await supabase.from('expenses').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'expenses', recordId: data.id, newValue: payload });
  revalidatePath('/gastos');
  return { success: true };
}

export async function updateExpense(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = expenseSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    supplier_id: parsed.data.supplier_id !== undefined ? parsed.data.supplier_id || null : undefined,
    zone_id: parsed.data.zone_id !== undefined ? parsed.data.zone_id || null : undefined
  };

  const { error } = await supabase.from('expenses').update(payload).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'expenses', recordId: id, newValue: payload });
  revalidatePath('/gastos');
  return { success: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'delete', module: 'expenses', recordId: id });
  revalidatePath('/gastos');
  return { success: true };
}
