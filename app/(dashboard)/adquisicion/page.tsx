import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AcquisitionView } from '@/components/adquisicion/AcquisitionView';

export default async function AdquisicionPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: requests }, { data: zones }, { data: stores }, { data: categories }] = await Promise.all([
    supabase
      .from('acquisition_requests')
      .select('*, store:stores(*), category:pop_categories(*), requester:users!acquisition_requests_requested_by_fkey(*)')
      .order('created_at', { ascending: false }),
    supabase.from('zones').select('*').order('name'),
    supabase.from('stores').select('*').order('name'),
    supabase.from('pop_categories').select('*').order('name')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Solicitudes de adquisición</h1>
        <p className="text-sm text-slate-500">
          {user.role === 'admin' ? 'Solo el administrador puede aprobar la adquisición de nuevos productos POP.' : 'Solicita la adquisición de nuevos materiales POP.'}
        </p>
      </div>
      <AcquisitionView
        requests={(requests as any) ?? []}
        zones={(zones as any) ?? []}
        stores={(stores as any) ?? []}
        categories={(categories as any) ?? []}
        user={user}
      />
    </div>
  );
}
