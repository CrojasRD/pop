'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { userSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

/**
 * Crea un usuario nuevo (admin o jefe zonal). Usa el cliente con service_role
 * porque la creación de credenciales vive en Supabase Auth (auth.users), no
 * en una tabla de aplicación. El trigger handle_new_auth_user() crea el perfil
 * en public.users automáticamente a partir de los metadatos.
 */
export async function createUser(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  if (!parsed.data.password) return { error: 'La contraseña es obligatoria al crear un usuario' };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      username: parsed.data.username,
      role: parsed.data.role,
      zone_id: parsed.data.zone_id || null
    }
  });

  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'users', recordId: data.user?.id, newValue: { email: parsed.data.email, role: parsed.data.role } });
  revalidatePath('/usuarios');
  return { success: true };
}

export async function updateUser(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = userSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const { password, ...profileFields } = parsed.data;
  const payload = { ...profileFields, zone_id: profileFields.zone_id || null };

  const { error } = await supabase.from('users').update(payload).eq('id', id);
  if (error) return { error: error.message };

  if (password) {
    const admin = createAdminClient();
    const { error: pwError } = await admin.auth.admin.updateUserById(id, { password });
    if (pwError) return { error: pwError.message };
  }

  await logAudit({ action: 'update', module: 'users', recordId: id, newValue: payload });
  revalidatePath('/usuarios');
  return { success: true };
}

export async function setUserStatus(id: string, status: 'active' | 'inactive'): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('users').update({ status }).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'users', recordId: id, newValue: { status } });
  revalidatePath('/usuarios');
  return { success: true };
}
