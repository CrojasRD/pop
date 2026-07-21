'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export interface AuthActionState {
  error?: string;
}

export async function login(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '/dashboard');

  if (!email || !password) {
    return { error: 'Ingresa tu correo y contraseña.' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: 'Credenciales inválidas o usuario inactivo.' };
  }

  const { data: profile } = await supabase.from('users').select('status').eq('id', data.user.id).single();
  if (profile?.status === 'inactive') {
    await supabase.auth.signOut();
    return { error: 'Tu usuario está inactivo. Contacta al administrador.' };
  }

  await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
  await logAudit({ action: 'login', module: 'auth', recordId: data.user.id });

  redirect(redirectTo || '/dashboard');
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
