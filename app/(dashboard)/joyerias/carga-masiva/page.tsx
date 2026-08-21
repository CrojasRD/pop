import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { JoyeriasBulkTabs } from '@/components/joyerias/JoyeriasBulkTabs';

export default async function CargaMasivaJoyeriasPage() {
  await requireAdmin();
  const supabase = createClient();
  const [{ data: zones }, { data: stores }, { data: items }] = await Promise.all([
    supabase.from('zones').select('name').neq('name', 'COMERCIAL'),
    supabase.from('stores').select('code'),
    supabase.from('pop_items').select('internal_code')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Carga masiva de joyerías</h1>
        <p className="text-sm text-slate-500">Sube joyerías nuevas o actualiza en lote el estado/cantidad del inventario de las que ya existen.</p>
      </div>
      <JoyeriasBulkTabs
        zoneNames={(zones ?? []).map((z: any) => z.name)}
        existingStoreCodes={(stores ?? []).map((s: any) => s.code).filter(Boolean)}
        itemCodes={(items ?? []).map((i: any) => i.internal_code).filter(Boolean)}
      />
    </div>
  );
}
