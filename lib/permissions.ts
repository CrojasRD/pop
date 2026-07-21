import type { AppUser, EventRecord, ReplenishmentRequest, AcquisitionRequest } from '@/lib/types';

export const isAdmin = (user: AppUser) => user.role === 'admin';
export const isZonalManager = (user: AppUser) => user.role === 'zonal_manager';

/** El admin ve todo; el jefe zonal solo su zona. Se usa para filtrar queries client-side (RLS ya protege el server). */
export function scopedZoneId(user: AppUser): string | null {
  return isAdmin(user) ? null : user.zone_id;
}

export function canEditEvent(user: AppUser, event: EventRecord) {
  if (isAdmin(user)) return true;
  return event.created_by === user.id && event.status === 'pending';
}

export function canApproveEvent(user: AppUser) {
  return isAdmin(user);
}

/** El cronograma del camión lo gestiona exclusivamente el administrador. */
export function canManageTruckSchedule(user: AppUser) {
  return isAdmin(user);
}

/** Ubicación, responsable y estado de un activo los puede editar admin o el jefe zonal de su propia zona. */
export function canEditAsset(user: AppUser, assetZoneId: string) {
  return isAdmin(user) || user.zone_id === assetZoneId;
}

/** Eliminar un activo del registro es exclusivo del administrador. */
export function canDeleteAsset(user: AppUser) {
  return isAdmin(user);
}

export function canApproveReplenishment(user: AppUser) {
  return isAdmin(user);
}

export function canApproveAcquisition(user: AppUser) {
  return isAdmin(user);
}

export function canEditReplenishment(user: AppUser, req: ReplenishmentRequest) {
  if (isAdmin(user)) return true;
  return req.requested_by === user.id && req.status === 'pending';
}

export function canEditAcquisition(user: AppUser, req: AcquisitionRequest) {
  if (isAdmin(user)) return true;
  return req.requested_by === user.id && req.status === 'pending';
}

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: 'LayoutDashboard', roles: ['admin', 'zonal_manager'] },
  { href: '/inventario', label: 'Inventario POP', icon: 'Package', roles: ['admin', 'zonal_manager'] },
  { href: '/joyerias', label: 'Joyerías', icon: 'Store', roles: ['admin', 'zonal_manager'] },
  { href: '/eventos', label: 'Eventos', icon: 'CalendarDays', roles: ['admin', 'zonal_manager'] },
  { href: '/camion', label: 'Camión', icon: 'Truck', roles: ['admin', 'zonal_manager'] },
  { href: '/activos', label: 'Activos', icon: 'Boxes', roles: ['admin', 'zonal_manager'] },
  { href: '/reposicion', label: 'Solicitudes de reposición', icon: 'RefreshCcw', roles: ['admin', 'zonal_manager'] },
  { href: '/adquisicion', label: 'Solicitudes de adquisición', icon: 'ShoppingCart', roles: ['admin', 'zonal_manager'] },
  { href: '/proveedores', label: 'Proveedores', icon: 'Building2', roles: ['admin'] },
  { href: '/gastos', label: 'Gastos', icon: 'DollarSign', roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios y zonas', icon: 'Users', roles: ['admin'] },
  { href: '/reportes', label: 'Reportes', icon: 'BarChart3', roles: ['admin'] },
  { href: '/historial', label: 'Historial', icon: 'History', roles: ['admin'] },
  { href: '/configuracion', label: 'Configuración', icon: 'Settings', roles: ['admin', 'zonal_manager'] }
] as const;
