import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { InventoryPageTabs } from '@/components/inventario/InventoryPageTabs';
import { Button } from '@/components/ui/Button';

// Materiales que se controlan por joyería (acrílicos, habladores y
// rompetráficos) — son los que se muestran en la vista "Control por zona".
const ZONE_TRACKED_CODES = ['ACR-001', 'HAB-001', 'RT-000', 'RT-001', 'RT-002', 'RT-003', 'RT-004', 'RT-005'];

export default async function InventarioPage() {
  const user = await requireUser();
  const supabase = createClient();

  // RLS ya limita lo que cada rol puede leer; para jefe zonal el catálogo es
  // visible (para poder solicitar), pero la vista destaca solo lo asignado a su zona.
  const [itemsRes, categoriesRes, zonesRes, storesRes, assignmentsRes] = await Promise.all([
    supabase.from('pop_items').select('*, category:pop_categories(*)').order('name'),
    supabase.from('pop_categories').select('*').order('name'),
    supabase.from('zones').select('*').order('name'),
    supabase.from('stores').select('*').eq('status', 'active').order('name'),
    supabase.from('inventory_assignments').select('*')
  ]);

  const zoneItems = ((itemsRes.data as any) ?? []).filter((i: any) => ZONE_TRACKED_CODES.includes(i.internal_code));
  const zoneItemIds = new Set(zoneItems.map((i: any) => i.id));
  const zoneAssignments = ((assignmentsRes.data as any) ?? []).filter((a: any) => zoneItemIds.has(a.pop_item_id));

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

      <InventoryPageTabs
        user={user}
        items={(itemsRes.data as any) ?? []}
        categories={(categoriesRes.data as any) ?? []}
        zones={(zonesRes.data as any) ?? []}
        stores={(storesRes.data as any) ?? []}
        zoneItems={zoneItems}
        assignments={zoneAssignments}
        isAdmin={user.role === 'admin'}
      />
    </div>
  );
}
