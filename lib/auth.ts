import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { AppUser } from '@/lib/types';

/** Devuelve el perfil de aplicación (public.users) del usuario autenticado, o null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) console.error('[auth] getUser error:', authError.message);
    if (!user) { console.error('[auth] No auth user'); return null; }

    // Intentar con admin client (bypasa RLS)
    try {
      const admin = createAdminClient();
      const { data: profile, error: adminErr } = await admin
        .from('users')
        .select('*, zone:zones(*)')
        .eq('id', user.id)
        .single();
      if (adminErr) console.error('[auth] admin profile error:', adminErr.message, adminErr.code);
      if (profile) return profile as AppUser;
    } catch (e) {
      console.error('[auth] admin client threw:', e);
    }

    // Fallback: cliente regular (requiere RLS abierto)
    const { data: profile, error: regErr } = await supabase
      .from('users')
      .select('*, zone:zones(*)')
      .eq('id', user.id)
      .single();
    if (regErr) console.error('[auth] regular profile error:', regErr.message);
    return (profile as AppUser) ?? null;
  } catch (e) {
    console.error('[auth] critical error:', e);
    return null;
  }
}

/** Redirige a /login si no hay sesión. Úsalo al inicio de páginas protegidas. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.status === 'inactive') redirect('/login?error=inactive');
  return user;
}

/** Redirige si el usuario no es administrador. Úsalo en páginas exclusivas de admin. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/dashboard?error=forbidden');
  return user;
}
