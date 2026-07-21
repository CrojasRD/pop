import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TruckScheduleView } from '@/components/camion/TruckScheduleView';

export default async function CamionPage() {
  const user = await requireUser();
  const supabase = createClient();

  // RLS limita automáticamente: el jefe zonal solo recibe las filas de su propia zona.
  const [{ data: stops }, { data: zones }] = await Promise.all([
    supabase.from('truck_schedule').select('*, zone:zones(*)').order('start_date', { ascending: true }),
    supabase.from('zones').select('*').order('name')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Camión de la empresa</h1>
        <p className="text-sm text-slate-500">
          {user.role === 'admin'
            ? 'Programa las fechas y zonas que visitará el camión de la empresa.'
            : 'Consulta cuándo estará el camión de la empresa en tu zona.'}
        </p>
      </div>
      <TruckScheduleView stops={(stops as any) ?? []} zones={(zones as any) ?? []} user={user} />
    </div>
  );
}
