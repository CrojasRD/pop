import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { UserTable } from '@/components/usuarios/UserTable';
import { Button } from '@/components/ui/Button';

export default async function UsuariosPage() {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: users }, { data: zones }] = await Promise.all([
    supabase.from('users').select('*, zone:zones(*)').order('full_name'),
    supabase.from('zones').select('*').neq('name', 'COMERCIAL').order('name')
  ]);

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
      <UserTable users={(users as any) ?? []} zones={(zones as any) ?? []} />
    </div>
  );
}
