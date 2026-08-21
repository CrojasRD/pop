import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { UserTable } from '@/components/usuarios/UserTable';
import { Button } from '@/components/ui/Button';

export default async function UsuariosPage() {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: users, error: usersError }, { data: zones }] = await Promise.all([
    supabase.from('users').select('*, zone:zones!zone_id(*)').order('full_name'),
    supabase.from('zones').select('*').neq('name', 'COMERCIAL').order('name')
  ]);

  if (usersError) {
    console.error('Error cargando usuarios:', usersError);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Usuarios y zonas</h1>
          <p className="text-sm text-slate-500">Administra usuarios, roles y la asignación de zonas.</p>
        </div>
        <Link href="/zonas">
          <Button variant="outline">Gestionar zonas</Button>
        </Link>
      </div>
      {usersError ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          Error al cargar usuarios: {usersError.message}
        </p>
      ) : null}
      <UserTable users={(users as any) ?? []} zones={(zones as any) ?? []} />
    </div>
  );
}
