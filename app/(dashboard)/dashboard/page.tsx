import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminSummary, type AdminSummaryData } from '@/components/dashboard/AdminSummary';
import { ZonalSummary, type ZonalSummaryData } from '@/components/dashboard/ZonalSummary';

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = createClient();

  if (user.role === 'admin') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [popItems, stores, zones, zonalManagers, pendingReplenishment, pendingAcquisition, pendingEvents, approvedEvents, lowStock, movements] =
      await Promise.all([
        supabase.from('pop_items').select('id', { count: 'exact', head: true }),
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('zones').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'zonal_manager'),
        supabase.from('replenishment_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('acquisition_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('start_date', startOfMonth.toISOString().slice(0, 10)),
        supabase.from('pop_items').select('*').order('warehouse_quantity', { ascending: true }).limit(50),
        supabase
          .from('inventory_movements')
          .select('*, pop_item:pop_items(name), store:stores(name)')
          .order('created_at', { ascending: false })
          .limit(6)
      ]);

    const data: AdminSummaryData = {
      totalPopItems: popItems.count ?? 0,
      totalStores: stores.count ?? 0,
      totalZones: zones.count ?? 0,
      totalZonalManagers: zonalManagers.count ?? 0,
      pendingReplenishment: pendingReplenishment.count ?? 0,
      pendingAcquisition: pendingAcquisition.count ?? 0,
      pendingEvents: pendingEvents.count ?? 0,
      approvedEventsThisMonth: approvedEvents.count ?? 0,
      lowStockItems: (lowStock.data ?? []).filter((i: any) => i.warehouse_quantity <= i.low_stock_threshold),
      recentMovements: (movements.data ?? []) as any
    };

    return (
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-800">Resumen general</h1>
        <p className="mb-4 text-sm text-slate-500">Vista consolidada de todas las zonas y joyerías.</p>
        <AdminSummary data={data} />
      </div>
    );
  }

  // Jefe zonal — todo filtrado por su zona (además reforzado por RLS)
  const zoneId = user.zone_id;

  const [stores, assignments, requests, events, lowStockAssignments] = await Promise.all([
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('zone_id', zoneId),
    supabase.from('inventory_assignments').select('assigned_quantity').eq('zone_id', zoneId),
    supabase.from('replenishment_requests').select('status').eq('zone_id', zoneId),
    supabase.from('events').select('status').eq('zone_id', zoneId),
    supabase
      .from('inventory_assignments')
      .select('*, pop_item:pop_items(*)')
      .eq('zone_id', zoneId)
  ]);

  const requestRows = requests.data ?? [];
  const eventRows = events.data ?? [];
  const lowStockItems = (lowStockAssignments.data ?? [])
    .map((a: any) => a.pop_item)
    .filter((item: any) => item && item.warehouse_quantity <= item.low_stock_threshold)
    .filter((item: any, idx: number, arr: any[]) => arr.findIndex((i) => i.id === item.id) === idx);

  const data: ZonalSummaryData = {
    totalStores: stores.count ?? 0,
    availableInZone: (assignments.data ?? []).reduce((sum: number, a: any) => sum + (a.assigned_quantity ?? 0), 0),
    pendingRequests: requestRows.filter((r: any) => r.status === 'pending').length,
    approvedRequests: requestRows.filter((r: any) => r.status === 'approved' || r.status === 'delivered').length,
    rejectedRequests: requestRows.filter((r: any) => r.status === 'rejected').length,
    eventsCreated: eventRows.length,
    eventsApproved: eventRows.filter((e: any) => e.status === 'approved').length,
    lowStockItems
  };

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold text-slate-800">Resumen de tu zona</h1>
      <p className="mb-4 text-sm text-slate-500">Información de las joyerías asignadas a ti.</p>
      <ZonalSummary data={data} />
    </div>
  );
}
