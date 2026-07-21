// =====================================================================
// Tipos de dominio — reflejan el esquema de supabase/00_schema.sql
// =====================================================================

export type UserRole = 'admin' | 'zonal_manager';
export type UserStatus = 'active' | 'inactive';
export type StoreStatus = 'active' | 'inactive';
export type PopItemStatus = 'available' | 'assigned' | 'in_use' | 'in_repair' | 'decommissioned';
// Estado físico del material en la joyería. Editable por admin y jefe zonal.
export type AssignmentStatus = 'good' | 'damaged' | 'maintenance' | 'in_stock' | 'out_of_stock';
export type MovementType = 'delivery' | 'return' | 'write_off' | 'repair' | 'adjustment' | 'bulk_import';
export type EventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'finished';
export type TruckStatus = 'scheduled' | 'cancelled';
export type AssetStatus = 'good' | 'damaged' | 'maintenance';
export type SupplierStatus = 'active' | 'inactive';
export type ExpenseCategory =
  | 'material_pop'
  | 'logistica'
  | 'camion'
  | 'mantenimiento'
  | 'personal'
  | 'proveedores'
  | 'otros';
export type RequestUrgency = 'low' | 'medium' | 'high';
export type ReplenishmentStatus = 'pending' | 'approved' | 'rejected' | 'delivered';
export type AcquisitionStatus = 'pending' | 'approved' | 'rejected' | 'in_purchase' | 'received';
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'deliver'
  | 'replenish'
  | 'bulk_upload'
  | 'login';

export interface Zone {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  username: string;
  role: UserRole;
  zone_id: string | null;
  status: UserStatus;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  zone?: Zone | null;
}

export interface Store {
  id: string;
  code: string | null;
  name: string;
  city: string;
  province: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  zone_id: string | null;
  zonal_manager_id: string | null;
  status: StoreStatus;
  created_at: string;
  updated_at: string;
  zone?: Zone | null;
  zonal_manager?: AppUser | null;
}

export interface PopCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface PopItem {
  id: string;
  name: string;
  category_id: string | null;
  description: string | null;
  internal_code: string;
  image_url: string | null;
  total_quantity: number;
  warehouse_quantity: number;
  assigned_quantity: number;
  repair_quantity: number;
  inactive_quantity: number;
  status: PopItemStatus;
  // Disponibilidad manual editable por el administrador (Disponible/No disponible).
  is_available: boolean;
  low_stock_threshold: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: PopCategory | null;
}

export interface InventoryAssignment {
  id: string;
  pop_item_id: string;
  store_id: string;
  zone_id: string | null;
  assigned_quantity: number;
  delivery_date: string | null;
  return_date: string | null;
  status: AssignmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  pop_item?: PopItem;
  store?: Store;
}

export interface InventoryMovement {
  id: string;
  pop_item_id: string;
  store_id: string | null;
  assignment_id: string | null;
  movement_type: MovementType;
  quantity: number;
  previous_quantity: number | null;
  new_quantity: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  pop_item?: PopItem;
  store?: Store;
}

export interface RequiredMaterial {
  pop_item_id: string;
  quantity: number;
}

export interface EventRecord {
  id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  city: string | null;
  province: string | null;
  location: string | null;
  store_id: string | null;
  zone_id: string | null;
  zonal_manager_id: string | null;
  event_type: string | null;
  description: string | null;
  required_pop_materials: RequiredMaterial[];
  justification: string | null;
  status: EventStatus;
  admin_comment: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  store?: Store | null;
  zone?: Zone | null;
}

export interface TruckStop {
  id: string;
  zone_id: string;
  activity_name: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  status: TruckStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  zone?: Zone | null;
}

export interface Asset {
  id: string;
  asset_type: string;
  zone_id: string;
  store_id: string | null;
  location: string | null;
  responsible_name: string | null;
  status: AssetStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  zone?: Zone | null;
  store?: Store | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  notes: string | null;
  status: SupplierStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  supplier_id: string | null;
  zone_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier | null;
  zone?: Zone | null;
}

export interface ReplenishmentRequest {
  id: string;
  requested_by: string | null;
  zone_id: string | null;
  store_id: string | null;
  pop_item_id: string | null;
  // El jefe zonal solo pide el material; el administrador asigna la cantidad al aprobar.
  requested_quantity: number | null;
  reason: string | null;
  urgency: RequestUrgency;
  zonal_comment: string | null;
  status: ReplenishmentStatus;
  admin_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  pop_item?: PopItem | null;
  store?: Store | null;
  requester?: AppUser | null;
}

export interface AcquisitionRequest {
  id: string;
  requested_by: string | null;
  zone_id: string | null;
  store_id: string | null;
  product_name: string;
  category_id: string | null;
  requested_quantity: number;
  justification: string | null;
  related_event_id: string | null;
  urgency: RequestUrgency;
  attachment_url: string | null;
  status: AcquisitionStatus;
  admin_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  estimated_purchase_date: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  category?: PopCategory | null;
  store?: Store | null;
  requester?: AppUser | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action_type: AuditAction;
  module: string;
  record_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  user?: AppUser | null;
}

// Tipo mínimo requerido por @supabase/ssr; se puede reemplazar por el
// tipo generado con `supabase gen types typescript` una vez enlazado el proyecto.
export type Database = any;
