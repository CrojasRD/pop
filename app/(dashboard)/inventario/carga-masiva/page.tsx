import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { InventoryBulkTabs } from '@/components/inventario/InventoryBulkTabs';

export default async function CargaMasivaInventarioPage() {
  await requireAdmin();
  const supabase = createClient();
  const [{ data: items }, { data: categories }, { data: stores }] = await Promise.all([
    supabase.from('pop_items').select('internal_code'),
    supabase.from('pop_categories').select('name'),
    supabase.from('stores').select('code')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Carga masiva de inventario</h1>
        <p className="text-sm text-slate-500">
          Registra materiales nuevos en el catálogo o distribuye cantidades ya existentes a las joyerías. Sube un archivo CSV o Excel, revisa la vista previa y confirma.
        </p>
      </div>
      <InventoryBulkTabs
        existingCodes={(items ?? []).map((i: any) => i.internal_code)}
        categoryNames={(categories ?? []).map((c: any) => c.name)}
        storeCodes={(stores ?? []).map((s: any) => s.code).filter(Boolean)}
      />
    </div>
  );
}
