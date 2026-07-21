import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { InventoryForm } from '@/components/inventario/InventoryForm';

export default async function NuevoMaterialPage() {
  await requireAdmin();
  const supabase = createClient();
  const { data: categories } = await supabase.from('pop_categories').select('*').order('name');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Nuevo material POP</h1>
        <p className="text-sm text-slate-500">Registra un nuevo material en el catálogo general.</p>
      </div>
      <InventoryForm categories={(categories as any) ?? []} />
    </div>
  );
}
