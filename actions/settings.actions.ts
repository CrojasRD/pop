'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import type { ActionResult } from './inventory.actions';

export async function updateOwnPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' };
  if (password !== confirm) return { error: 'Las contraseñas no coinciden' };

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'users', recordId: user.id, newValue: { password_changed: true } });
  return { success: true };
}

export async function createCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!name) return { error: 'El nombre de la categoría es obligatorio' };

  const supabase = createClient();
  const { data, error } = await supabase.from('pop_categories').insert({ name, description: description || null }).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'pop_categories', recordId: data.id, newValue: { name } });
  revalidatePath('/configuracion');
  return { success: true };
}
