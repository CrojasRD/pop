import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Refresca la sesión de Supabase en cada request y devuelve la respuesta + el usuario. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // Si Supabase Auth está caído o muy lento, no dejamos que el middleware
  // cuelgue toda la app (Vercel termina la función a los ~25s y devuelve
  // 504 en cualquier ruta, incluido /login). Con este límite, ante una
  // caída seguimos sirviendo la página y dejamos que cada ruta protegida
  // maneje la falta de sesión por su cuenta.
  const user = await Promise.race([
    supabase.auth.getUser().then(({ data }) => data.user),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
  ]).catch(() => null);

  return { response: supabaseResponse, user };
}
