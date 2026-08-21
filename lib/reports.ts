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
