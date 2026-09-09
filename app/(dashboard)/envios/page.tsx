import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ShipmentsView } from '@/components/envios/ShipmentsView';

export default async function EnviosPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: shipments }, { data: stores }, { data: popItems }] = await Promise.all([
    supabase
      .from('material_shipments')
      .select('*, zone:zones(*), store:stores(*), pop_item:pop_items(*), sender:users!material_shipments_sent_by_fkey(*), receiver:users!material_shipments_delivered_by_fkey(*)')
      .order('sent_at', { ascending: false }),
    supabase.from('stores').select('*').order('name'),
    supabase.from('pop_items').select('*').order('name')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Envíos</h1>
        <p className="text-sm text-slate-500">
          {user.role === 'admin'
            ? 'Registra los materiales que se envían a las joyerías.'
            : 'Confirma la entrega de los materiales que llegan a tus joyerías.'}
        </p>
      </div>
      <ShipmentsView
        shipments={(shipments as any) ?? []}
        stores={(stores as any) ?? []}
        popItems={(popItems as any) ?? []}
        user={user}
      />
    </div>
  );
}
