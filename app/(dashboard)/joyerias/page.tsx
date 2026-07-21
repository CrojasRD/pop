import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StoreTable } from '@/components/joyerias/StoreTable';

export default async function JoyeriasPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: stores }, { data: zones }, { data: managers }] = await Promise.all([
    supabase.from('stores').select('*, zone:zones(*), zonal_manager:users!stores_zonal_manager_id_fkey(*)').order('name'),
    supabase.from('zones').select('*').order('name'),
    supabase.from('users').select('*').eq('role', 'zonal_manager').order('full_name')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Joyerías</h1>
        <p className="text-sm text-slate-500">
          {user.role === 'admin' ? 'Administra las joyerías y su asignación a zonas y jefes zonales.' : 'Joyerías asignadas a tu zona.'}
        </p>
      </div>
      <StoreTable
        stores={(stores as any) ?? []}
        zones={(zones as any) ?? []}
        managers={(managers as any) ?? []}
        isAdmin={user.role === 'admin'}
      />
    </div>
  );
}
