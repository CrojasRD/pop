import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SupplierTable } from '@/components/proveedores/SupplierTable';

export default async function ProveedoresPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data: suppliers } = await supabase.from('suppliers').select('*').order('name');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Proveedores</h1>
        <p className="text-sm text-slate-500">Registro de proveedores de la empresa. Módulo exclusivo de administrador.</p>
      </div>
      <SupplierTable suppliers={(suppliers as any) ?? []} />
    </div>
  );
}
