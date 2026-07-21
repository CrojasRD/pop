import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric', ...opts }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  available: 'Disponible',
  assigned: 'Asignado',
  in_use: 'En uso',
  in_repair: 'En reparación',
  decommissioned: 'Dado de baja',
  returned: 'Devuelto',
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelado',
  finished: 'Finalizado',
  delivered: 'Entregada',
  in_purchase: 'En compra',
  received: 'Recibida',
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  admin: 'Administrador',
  zonal_manager: 'Jefe Zonal',
  delivery: 'Entrega',
  return: 'Devolución',
  write_off: 'Baja',
  repair: 'Reparación',
  adjustment: 'Ajuste',
  bulk_import: 'Carga masiva',
  create: 'Creación',
  update: 'Edición',
  delete: 'Eliminación',
  approve: 'Aprobación',
  reject: 'Rechazo',
  deliver: 'Entrega',
  replenish: 'Reposición',
  bulk_upload: 'Carga masiva',
  login: 'Inicio de sesión',
  scheduled: 'Programado',
  in_zone: 'En zona actualmente',
  completed: 'Completado',
  good: 'Buen estado',
  damaged: 'Dañado',
  maintenance: 'En mantenimiento',
  in_stock: 'En stock',
  out_of_stock: 'Sin stock',
  material_pop: 'Material POP',
  logistica: 'Logística',
  camion: 'Camión',
  personal: 'Personal',
  proveedores: 'Proveedores',
  otros: 'Otros'
};

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-600',
  available: 'bg-emerald-100 text-emerald-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_use: 'bg-indigo-100 text-indigo-700',
  in_repair: 'bg-amber-100 text-amber-700',
  decommissioned: 'bg-slate-200 text-slate-600',
  returned: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600',
  finished: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  in_purchase: 'bg-blue-100 text-blue-700',
  received: 'bg-emerald-100 text-emerald-700',
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  scheduled: 'bg-amber-100 text-amber-700',
  in_zone: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-200 text-slate-600',
  good: 'bg-emerald-100 text-emerald-700',
  damaged: 'bg-red-100 text-red-700',
  maintenance: 'bg-amber-100 text-amber-700',
  in_stock: 'bg-blue-100 text-blue-700',
  out_of_stock: 'bg-slate-200 text-slate-600',
  material_pop: 'bg-indigo-100 text-indigo-700',
  logistica: 'bg-blue-100 text-blue-700',
  camion: 'bg-amber-100 text-amber-700',
  personal: 'bg-purple-100 text-purple-700',
  proveedores: 'bg-teal-100 text-teal-700',
  otros: 'bg-slate-100 text-slate-600'
};

export function statusLabel(value: string) {
  return STATUS_LABELS[value] ?? value;
}

export function statusColor(value: string) {
  return STATUS_COLORS[value] ?? 'bg-slate-100 text-slate-600';
}

export function formatCurrency(value: number | null | undefined) {
  const amount = value ?? 0;
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
