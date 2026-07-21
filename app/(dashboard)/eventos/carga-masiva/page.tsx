import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BulkUploadEvents } from '@/components/eventos/BulkUploadEvents';

export default async function CargaMasivaEventosPage() {
  const user = await requireAdmin();
  const supabase = createClient();
  const [{ data: stores }, { data: zones }] = await Promise.all([
    supabase.from('stores').select('name'),
    supabase.from('zones').select('name')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Carga masiva de eventos</h1>
        <p className="text-sm text-slate-500">Los eventos importados quedan en estado Pendiente para revisión.</p>
      </div>
      <BulkUploadEvents
        storeNames={(stores ?? []).map((s: any) => s.name)}
        zoneNames={(zones ?? []).map((z: any) => z.name)}
        userId={user.id}
      />
    </div>
  );
}
