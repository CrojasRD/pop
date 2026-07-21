import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AppUser } from '@/lib/types';

/** Devuelve el perfil de aplicación (public.users) del usuario autenticado, o null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*, zone:zones(*)')
    .eq('id', user.id)
    .single();

  return (profile as AppUser) ?? null;
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
