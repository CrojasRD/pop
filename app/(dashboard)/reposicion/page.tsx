import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ReplenishmentView } from '@/components/reposicion/ReplenishmentView';

export default async function ReposicionPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: requests }, { data: zones }, { data: stores }, { data: popItems }] = await Promise.all([
    supabase
      .from('replenishment_requests')
      .select('*, store:stores(*), pop_item:pop_items(*), requester:users!replenishment_requests_requested_by_fkey(*)')
      .order('created_at', { ascending: false }),
    supabase.from('zones').select('*').order('name'),
    supabase.from('stores').select('*').order('name'),
    supabase.from('pop_items').select('*').order('name')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Solicitudes de reposición</h1>
        <p className="text-sm text-slate-500">
          {user.role === 'admin' ? 'Aprueba, rechaza y registra la entrega de reposiciones de inventario.' : 'Solicita reposición de materiales POP para tus joyerías.'}
        </p>
      </div>
      <ReplenishmentView
        requests={(requests as any) ?? []}
        zones={(zones as any) ?? []}
        stores={(stores as any) ?? []}
        popItems={(popItems as any) ?? []}
        user={user}
      />
    </div>
  );
}
