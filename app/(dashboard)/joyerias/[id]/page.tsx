import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StoreInventoryTable } from '@/components/joyerias/StoreInventoryTable';

export default async function StoreDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const supabase = createClient();

  // RLS ya limita el acceso: un jefe zonal solo puede leer joyerías de su propia zona.
  const { data: store } = await supabase
    .from('stores')
    .select('*, zone:zones(*), zonal_manager:users!stores_zonal_manager_id_fkey(*)')
    .eq('id', params.id)
    .single();

  if (!store) notFound();

  const { data: assignments } = await supabase
    .from('inventory_assignments')
    .select('*, pop_item:pop_items(*, category:pop_categories(*))')
    .eq('store_id', params.id)
    .order('created_at', { ascending: false });

  const list = (assignments as any[]) ?? [];
  const totalUnits = list.reduce((sum, a) => sum + (a.assigned_quantity ?? 0), 0);
  const good = list.filter((a) => a.status === 'good' || a.status === 'in_stock').length;
  const needsAttention = list.filter((a) => a.status === 'damaged' || a.status === 'maintenance').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400">{store.code ?? '—'}</p>
          <h1 className="text-xl font-semibold text-slate-800">{store.name}</h1>
          <p className="text-sm text-slate-500">
            {store.city}, {store.province} · Zona: {store.zone?.name ?? '—'} · Jefe zonal: {store.zonal_manager?.full_name ?? '—'}
          </p>
        </div>
        <Badge status={store.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4 text-center">
          <p className="text-xs uppercase text-slate-400">Materiales distintos</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">{list.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs uppercase text-slate-400">Unidades totales</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">{totalUnits}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs uppercase text-slate-400">En buen estado</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600">{good}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs uppercase text-slate-400">Requieren atención</p>
          <p className="mt-1 text-xl font-semibold text-amber-600">{needsAttention}</p>
        </Card>
      </div>

      {store.email || store.phone || store.company ? (
        <Card>
          <CardContent className="grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-3">
            <p><span className="font-medium text-slate-700">Empresa:</span> {store.company ?? '—'}</p>
            <p><span className="font-medium text-slate-700">Correo:</span> {store.email ?? '—'}</p>
            <p><span className="font-medium text-slate-700">Teléfono:</span> {store.phone ?? '—'}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Inventario POP asignado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <StoreInventoryTable assignments={list} user={user} storeZoneId={store.zone_id} />
        </CardContent>
      </Card>
    </div>
  );
}
