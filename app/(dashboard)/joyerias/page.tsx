import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { JoyeriasPageTabs } from '@/components/joyerias/JoyeriasPageTabs';

// Mismos materiales que se controlan por joyería en Inventario POP
// (acrílicos, habladores y rompetráficos) para la vista "Control por zona".
const ZONE_TRACKED_CODES = ['ACR-001', 'HAB-001', 'RT-000', 'RT-001', 'RT-002', 'RT-003', 'RT-004', 'RT-005'];

export default async function JoyeriasPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: stores }, { data: zones }, { data: managers }, { data: items }, { data: assignments }] = await Promise.all([
    supabase.from('stores').select('*, zone:zones(*), zonal_manager:users!stores_zonal_manager_id_fkey(*)').order('name'),
    supabase.from('zones').select('*').order('name'),
    supabase.from('users').select('*').eq('role', 'zonal_manager').order('full_name'),
    supabase.from('pop_items').select('*, category:pop_categories(*)').order('name'),
    supabase.from('inventory_assignments').select('*')
  ]);

  const zoneItems = ((items as any) ?? []).filter((i: any) => ZONE_TRACKED_CODES.includes(i.internal_code));
  const zoneItemIds = new Set(zoneItems.map((i: any) => i.id));
  const zoneAssignments = ((assignments as any) ?? []).filter((a: any) => zoneItemIds.has(a.pop_item_id));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Joyerías</h1>
        <p className="text-sm text-slate-500">
          {user.role === 'admin' ? 'Administra las joyerías y su asignación a zonas y jefes zonales.' : 'Joyerías asignadas a tu zona.'}
        </p>
      </div>
      <JoyeriasPageTabs
        user={user}
        stores={(stores as any) ?? []}
        zones={(zones as any) ?? []}
        managers={(managers as any) ?? []}
        zoneItems={zoneItems}
        assignments={zoneAssignments}
        isAdmin={user.role === 'admin'}
      />
    </div>
  );
}
