import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { InventoryTable } from '@/components/inventario/InventoryTable';
import { Button } from '@/components/ui/Button';

export default async function InventarioPage() {
  const user = await requireUser();
  const supabase = createClient();

  // RLS ya limita lo que cada rol puede leer; para jefe zonal el catálogo es
  // visible (para poder solicitar), pero la vista destaca solo lo asignado a su zona.
  const [itemsRes, categoriesRes] = await Promise.all([
    supabase.from('pop_items').select('*, category:pop_categories(*)').order('name'),
    supabase.from('pop_categories').select('*').order('name')
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Inventario POP</h1>
          <p className="text-sm text-slate-500">
            {user.role === 'admin' ? 'Catálogo general de materiales POP.' : 'Consulta el catálogo y solicita reposición o adquisición.'}
          </p>
        </div>
        {user.role === 'admin' ? (
          <div className="flex gap-2">
            <Link href="/inventario/carga-masiva">
              <Button variant="outline"><Upload size={14} /> Carga masiva</Button>
            </Link>
            <Link href="/inventario/nuevo">
              <Button><Plus size={14} /> Nuevo material</Button>
            </Link>
          </div>
        ) : null}
      </div>

      <InventoryTable items={(itemsRes.data as any) ?? []} categories={(categoriesRes.data as any) ?? []} isAdmin={user.role === 'admin'} />
    </div>
  );
}
