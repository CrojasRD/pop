import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AssetsView } from '@/components/activos/AssetsView';

export default async function ActivosPage() {
  const user = await requireUser();
  const supabase = createClient();

  // RLS ya limita lo que cada rol puede leer: el jefe zonal solo ve los
  // activos de su propia zona.
  const [{ data: assets }, { data: zones }, { data: stores }] = await Promise.all([
    supabase.from('assets').select('*, zone:zones(*), store:stores(*)').order('created_at', { ascending: false }),
    supabase.from('zones').select('*').neq('name', 'COMERCIAL').order('name'),
    supabase.from('stores').select('*').eq('status', 'active').order('name')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Activos</h1>
        <p className="text-sm text-slate-500">
          {user.role === 'admin'
            ? 'Registro de activos publicitarios/promocionales: joyería y estado.'
            : 'Activos publicitarios de tu zona. Puedes actualizar su joyería y estado.'}
        </p>
      </div>
      <AssetsView assets={(assets as any) ?? []} zones={(zones as any) ?? []} stores={(stores as any) ?? []} user={user} />
    </div>
  );
}
