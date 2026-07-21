import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EventForm } from '@/components/eventos/EventForm';

export default async function NuevoEventoPage({ searchParams }: { searchParams: { edit?: string } }) {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: zones }, { data: stores }, { data: popItems }] = await Promise.all([
    supabase.from('zones').select('*').order('name'),
    supabase.from('stores').select('*').order('name'),
    supabase.from('pop_items').select('*').order('name')
  ]);

  let event = undefined;
  if (searchParams.edit) {
    const { data } = await supabase.from('events').select('*, zone:zones(*), store:stores(*)').eq('id', searchParams.edit).single();
    event = data as any;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{event ? 'Editar evento' : 'Nuevo evento'}</h1>
        <p className="text-sm text-slate-500">
          {user.role === 'zonal_manager' ? 'El evento quedará en estado Pendiente hasta ser revisado por el administrador.' : 'Completa los datos del evento.'}
        </p>
      </div>
      <EventForm user={user} zones={(zones as any) ?? []} stores={(stores as any) ?? []} popItems={(popItems as any) ?? []} event={event} />
    </div>
  );
}
