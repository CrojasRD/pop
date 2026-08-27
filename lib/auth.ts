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

    // NOTA DE SEGURIDAD (pendiente de investigación, ver auditoría de seguridad):
    // Este client admin bypasea RLS, pero el `.eq('id', user.id)` usa el `id`
    // ya devuelto por `supabase.auth.getUser()` (verificado contra el JWT de la
    // sesión, no un valor que venga del cliente), así que el alcance de esta
    // consulta sigue acotado al propio usuario autenticado — no hay forma de
    // leer el perfil de otro usuario a través de esta función.
    // El camino "ideal" sería usar el cliente RLS normal como primario (la
    // policy `users_select_self` en supabase/02_policies.sql ya permite
    // `id = auth.uid()`, y las funciones helper `is_admin()` /
    // `current_user_zone_id()` en supabase/01_functions.sql son
    // SECURITY DEFINER, por lo que en teoría no deberían recursar sobre la
    // RLS de `users`). Pero el fallback a admin sugiere que en la base real
    // esa policy está fallando por algún motivo no reproducido acá (posible
    // desincronización entre el SQL versionado y lo aplicado en producción,
    // rol/owner de las funciones, etc.). No se cambia el orden admin/RLS sin
    // poder probarlo contra la base real — ver reporte de la auditoría.
    // Intentar con admin client (bypasa RLS)
    try {
      const admin = createAdminClient();
      const { data: profile, error: adminErr } = await admin
        .from('users')
        .select('*, zone:zones!zone_id(*)')
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
      .select('*, zone:zones!zone_id(*)')
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
  if (!user) redirect('/login?force=true');
  if (user.status === 'inactive') redirect('/login?error=inactive&force=true');
  return user;
}

/** Redirige si el usuario no es administrador. Úsalo en páginas exclusivas de admin. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/dashboard?error=forbidden');
  return user;
}
