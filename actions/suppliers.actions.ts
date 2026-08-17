'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { supplierSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

// Proveedores: módulo exclusivo de administrador.

export async function createSupplier(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    contact_name: parsed.data.contact_name || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    address: parsed.data.address || null,
    category: parsed.data.category || null,
    notes: parsed.data.notes || null,
    created_by: admin.id
  };

  const { data, error } = await supabase.from('suppliers').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'suppliers', recordId: data.id, newValue: payload });
  revalidatePath('/proveedores');
  return { success: true };
}

export async function updateSupplier(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = supplierSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const { error } = await supabase.from('suppliers').update(parsed.data).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'suppliers', recordId: id, newValue: parsed.data });
  revalidatePath('/proveedores');
  return { success: true };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  // Sin `.select()`, Supabase/RLS no informa si el delete realmente afectó
  // alguna fila — si la política bloquea el borrado, responde "éxito" sin
  // haber borrado nada.
  const { error, data } = await supabase.from('suppliers').delete().eq('id', id).select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'No se pudo eliminar el proveedor. Verifica que tengas permisos de administrador o que todavía exista.' };
  }

  await logAudit({ action: 'delete', module: 'suppliers', recordId: id });
  revalidatePath('/proveedores');
  return { success: true };
}
