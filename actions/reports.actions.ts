'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

export type ReportType =
  | 'inventory_general'
  | 'inventory_by_zone'
  | 'inventory_by_store'
  | 'deliveries_by_date'
  | 'pending_replenishment'
  | 'events_by_month'
  | 'events_by_zone'
  | 'events_approved_rejected'
  | 'replenishment_approved_rejected'
  | 'acquisition_approved_rejected'
  | 'movement_history';

export const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'inventory_general', label: 'Inventario POP general' },
  { value: 'inventory_by_zone', label: 'Inventario POP por zona' },
  { value: 'inventory_by_store', label: 'Inventario POP por joyería' },
  { value: 'deliveries_by_date', label: 'Materiales POP entregados por fecha' },
  { value: 'pending_replenishment', label: 'Materiales POP pendientes de reposición' },
  { value: 'events_by_month', label: 'Eventos por mes' },
  { value: 'events_by_zone', label: 'Eventos por zona' },
  { value: 'events_approved_rejected', label: 'Eventos aprobados y rechazados' },
  { value: 'replenishment_approved_rejected', label: 'Solicitudes de reposición aprobadas/rechazadas' },
  { value: 'acquisition_approved_rejected', label: 'Solicitudes de adquisición aprobadas/rechazadas' },
  { value: 'movement_history', label: 'Historial de movimientos de inventario' }
];

export async function getReportData(type: ReportType): Promise<Record<string, unknown>[]> {
  // Los reportes son exclusivos del administrador; los jefes zonales no pueden generarlos ni descargarlos.
  await requireAdmin();
  const supabase = createClient();
  const zoneScope: string | null = null;

  switch (type) {
    case 'inventory_general': {
      const { data } = await supabase.from('pop_items').select('*, category:pop_categories(name)').order('name');
      return (data ?? []).map((i: any) => ({
        Material: i.name, Categoría: i.category?.name ?? '', Código: i.internal_code,
        Total: i.total_quantity, Bodega: i.warehouse_quantity, Asignado: i.assigned_quantity,
        Reparación: i.repair_quantity, Baja: i.inactive_quantity, Estado: i.status
      }));
    }
    case 'inventory_by_zone': {
      let query = supabase.from('inventory_assignments').select('*, pop_item:pop_items(name), zone:zones(name)');
      if (zoneScope) query = query.eq('zone_id', zoneScope);
      const { data } = await query;
      return (data ?? []).map((a: any) => ({
        Zona: a.zone?.name ?? '', Material: a.pop_item?.name ?? '', Cantidad: a.assigned_quantity, Estado: a.status
      }));
    }
    case 'inventory_by_store': {
      let query = supabase.from('inventory_assignments').select('*, pop_item:pop_items(name), store:stores(name, city)');
      if (zoneScope) query = query.eq('zone_id', zoneScope);
      const { data } = await query;
      return (data ?? []).map((a: any) => ({
        Joyería: a.store?.name ?? '', Ciudad: a.store?.city ?? '', Material: a.pop_item?.name ?? '',
        Cantidad: a.assigned_quantity, Estado: a.status
      }));
    }
    case 'deliveries_by_date': {
      let query = supabase
        .from('inventory_movements')
        .select('*, pop_item:pop_items(name), store:stores(name, zone_id)')
        .eq('movement_type', 'delivery')
        .order('created_at', { ascending: false });
      const { data } = await query;
      const filtered = zoneScope ? (data ?? []).filter((m: any) => m.store?.zone_id === zoneScope) : data ?? [];
      return filtered.map((m: any) => ({
        Fecha: formatDate(m.created_at), Material: m.pop_item?.name ?? '', Joyería: m.store?.name ?? '', Cantidad: m.quantity
      }));
    }
    case 'pending_replenishment': {
      let query = supabase
        .from('replenishment_requests')
        .select('*, pop_item:pop_items(name), store:stores(name)')
        .eq('status', 'pending');
      if (zoneScope) query = query.eq('zone_id', zoneScope);
      const { data } = await query;
      return (data ?? []).map((r: any) => ({
        Joyería: r.store?.name ?? '', Material: r.pop_item?.name ?? '', Cantidad: r.requested_quantity ?? 'Por definir (admin)',
        Urgencia: r.urgency, Solicitado: formatDate(r.created_at)
      }));
    }
    case 'events_by_month': {
      let query = supabase.from('events').select('*, zone:zones(name)').order('start_date', { ascending: false });
      if (zoneScope) query = query.eq('zone_id', zoneScope);
      const { data } = await query;
      return (data ?? []).map((e: any) => ({
        Mes: new Date(e.start_date).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' }),
        Evento: e.event_name, Zona: e.zone?.name ?? '', Estado: e.status
      }));
    }
    case 'events_by_zone': {
      let query = supabase.from('events').select('*, zone:zones(name)');
      if (zoneScope) query = query.eq('zone_id', zoneScope);
      const { data } = await query;
      return (data ?? []).map((e: any) => ({ Zona: e.zone?.name ?? '', Evento: e.event_name, Fecha: formatDate(e.start_date), Estado: e.status }));
    }
    case 'events_approved_rejected': {
      let query = supabase.from('events').select('*, zone:zones(name)').in('status', ['approved', 'rejected']);
      if (zoneScope) query = query.eq('zone_id', zoneScope);
      const { data } = await query;
      return (data ?? []).map((e: any) => ({
        Evento: e.event_name, Zona: e.zone?.name ?? '', Estado: e.status, Comentario: e.admin_comment ?? ''
      }));
    }
    case 'replenishment_approved_rejected': {
      let query = supabase.from('replenishment_requests').select('*, pop_item:pop_items(name), store:stores(name)').in('status', ['approved', 'rejected']);
      if (zoneScope) query = query.eq('zone_id', zoneScope);
      const { data } = await query;
      return (data ?? []).map((r: any) => ({
        Joyería: r.store?.name ?? '', Material: r.pop_item?.name ?? '', Estado: r.status, Comentario: r.admin_comment ?? ''
      }));
    }
    case 'acquisition_approved_rejected': {
      let query = supabase.from('acquisition_requests').select('*').in('status', ['approved', 'rejected']);
      if (zoneScope) query = query.eq('zone_id', zoneScope);
      const { data } = await query;
      return (data ?? []).map((r: any) => ({
        Producto: r.product_name, Cantidad: r.requested_quantity, Estado: r.status, Comentario: r.admin_comment ?? ''
      }));
    }
    case 'movement_history': {
      let query = supabase
        .from('inventory_movements')
        .select('*, pop_item:pop_items(name), store:stores(name, zone_id)')
        .order('created_at', { ascending: false })
        .limit(500);
      const { data } = await query;
      const filtered = zoneScope ? (data ?? []).filter((m: any) => !m.store || m.store.zone_id === zoneScope) : data ?? [];
      return filtered.map((m: any) => ({
        Fecha: formatDate(m.created_at), Material: m.pop_item?.name ?? '', Joyería: m.store?.name ?? '—',
        Tipo: m.movement_type, Cantidad: m.quantity
      }));
    }
    default:
      return [];
  }
}
