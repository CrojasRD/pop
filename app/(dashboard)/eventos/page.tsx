import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EventsView } from '@/components/eventos/EventsView';

export default async function EventosPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: events }, { data: zones }, { data: stores }, { data: popItems }] = await Promise.all([
    supabase.from('events').select('*, zone:zones(*), store:stores(*)').order('start_date', { ascending: false }),
    supabase.from('zones').select('*').order('name'),
    supabase.from('stores').select('*').order('name'),
    supabase.from('pop_items').select('id, name')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Eventos</h1>
        <p className="text-sm text-slate-500">Calendario de eventos mensuales y anuales de la marca.</p>
      </div>
      <EventsView
        events={(events as any) ?? []}
        zones={(zones as any) ?? []}
        stores={(stores as any) ?? []}
        popItemNames={Object.fromEntries(((popItems as any) ?? []).map((p: any) => [p.id, p.name]))}
        user={user}
      />
    </div>
  );
}
