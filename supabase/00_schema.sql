-- =====================================================================
-- OROCASH · Dashboard de Control de Inventario POP
-- Esquema de base de datos (PostgreSQL / Supabase)
-- Orden: extensiones > enums > tablas (respetando FKs) > indices
-- =====================================================================
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum ('admin', 'zonal_manager');
create type user_status as enum ('active', 'inactive');
create type store_status as enum ('active', 'inactive');
create type pop_item_status as enum ('available', 'assigned', 'in_use', 'in_repair', 'decommissioned');
-- Estado físico del material en la joyería. Lo puede actualizar tanto el
-- administrador como el jefe zonal de la zona correspondiente.
create type assignment_status as enum ('good', 'damaged', 'maintenance', 'in_stock', 'out_of_stock');
create type movement_type as enum ('delivery', 'return', 'write_off', 'repair', 'adjustment', 'bulk_import');
create type event_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'finished');
create type truck_status as enum ('scheduled', 'cancelled');
create type asset_status as enum ('good', 'damaged', 'maintenance');
create type supplier_status as enum ('active', 'inactive', 'alternative', 'pending_validation');
create type expense_category as enum ('material_pop', 'logistica', 'camion', 'mantenimiento', 'personal', 'proveedores', 'otros');
create type request_urgency as enum ('low', 'medium', 'high');
create type replenishment_status as enum ('pending', 'approved', 'rejected', 'delivered');
create type acquisition_status as enum ('pending', 'approved', 'rejected', 'in_purchase', 'received');
create type audit_action as enum ('create', 'update', 'delete', 'approve', 'reject', 'deliver', 'replenish', 'bulk_upload', 'login');

-- ---------------------------------------------------------------------
-- ZONES  (10 zonas, una por jefe zonal)
-- ---------------------------------------------------------------------
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- USERS  (perfil de aplicación; la contraseña vive en auth.users/Supabase Auth)
-- ---------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  username text not null unique,
  role user_role not null default 'zonal_manager',
  zone_id uuid references public.zones(id) on delete set null,
  status user_status not null default 'active',
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.zones
  add column manager_id uuid references public.users(id) on delete set null;

-- ---------------------------------------------------------------------
-- STORES  (joyerías)
-- ---------------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  city text not null,
  province text not null,
  address text,
  email text,
  phone text,
  company text,
  zone_id uuid references public.zones(id) on delete set null,
  zonal_manager_id uuid references public.users(id) on delete set null,
  status store_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- POP CATEGORIES (estructura abierta para agregar categorías)
-- ---------------------------------------------------------------------
create table public.pop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

insert into public.pop_categories (name) values
  ('Bicicletas'), ('Inflables'), ('Stands'), ('Carpas'), ('Roll ups'),
  ('Backings'), ('Banners'), ('Mesas promocionales'), ('Sillas'),
  ('Uniformes'), ('Material publicitario'), ('Otros insumos POP');

-- ---------------------------------------------------------------------
-- POP ITEMS  (catálogo/stock agregado de materiales POP)
-- ---------------------------------------------------------------------
create table public.pop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.pop_categories(id) on delete set null,
  description text,
  internal_code text not null unique,
  image_url text,
  total_quantity integer not null default 0 check (total_quantity >= 0),
  warehouse_quantity integer not null default 0 check (warehouse_quantity >= 0),
  assigned_quantity integer not null default 0 check (assigned_quantity >= 0),
  repair_quantity integer not null default 0 check (repair_quantity >= 0),
  inactive_quantity integer not null default 0 check (inactive_quantity >= 0),
  status pop_item_status not null default 'available',
  -- Disponibilidad manual del material, controlada por el administrador desde
  -- la tabla de Inventario POP (independiente del cálculo de bodega/asignado/
  -- reparación/baja que sigue gestionando `status` internamente).
  is_available boolean not null default true,
  low_stock_threshold integer not null default 5,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pop_items_quantity_balance check (
    warehouse_quantity + assigned_quantity + repair_quantity + inactive_quantity <= total_quantity
  )
);

-- ---------------------------------------------------------------------
-- INVENTORY ASSIGNMENTS  (material POP asignado a una joyería específica)
-- ---------------------------------------------------------------------
create table public.inventory_assignments (
  id uuid primary key default gen_random_uuid(),
  pop_item_id uuid not null references public.pop_items(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  zone_id uuid references public.zones(id) on delete set null,
  assigned_quantity integer not null check (assigned_quantity > 0),
  delivery_date date,
  return_date date,
  status assignment_status not null default 'assigned',
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- INVENTORY MOVEMENTS  (historial detallado: entregas, devoluciones, bajas...)
-- ---------------------------------------------------------------------
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  pop_item_id uuid not null references public.pop_items(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  assignment_id uuid references public.inventory_assignments(id) on delete set null,
  movement_type movement_type not null,
  quantity integer not null,
  previous_quantity integer,
  new_quantity integer,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- EVENTS  (eventos mensuales/anuales, calendario)
-- ---------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  city text,
  province text,
  location text,
  store_id uuid references public.stores(id) on delete set null,
  zone_id uuid references public.zones(id) on delete set null,
  zonal_manager_id uuid references public.users(id) on delete set null,
  event_type text,
  description text,
  required_pop_materials jsonb not null default '[]'::jsonb, -- [{pop_item_id, quantity}]
  justification text,
  status event_status not null default 'pending',
  admin_comment text,
  created_by uuid references public.users(id) on delete set null,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_date_order check (end_date >= start_date)
);

-- ---------------------------------------------------------------------
-- TRUCK SCHEDULE  (cronograma del camión de la empresa por zona)
-- ---------------------------------------------------------------------
create table public.truck_schedule (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  activity_name text not null,
  start_date date not null,
  end_date date not null,
  notes text,
  status truck_status not null default 'scheduled',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint truck_schedule_date_order check (end_date >= start_date)
);

create index idx_truck_schedule_zone on public.truck_schedule(zone_id);
create index idx_truck_schedule_dates on public.truck_schedule(start_date, end_date);

-- ---------------------------------------------------------------------
-- ASSETS  (activos publicitarios/promocionales: inflables, banners, etc.)
-- Catálogo base (referencial, no restrictivo): Inflable, Banner Human,
-- Bicicleta Publicitaria, Lona Rompetráfico, Mano y Anillo, Parlante.
-- ---------------------------------------------------------------------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  zone_id uuid not null references public.zones(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  location text,
  responsible_name text,
  status asset_status not null default 'good',
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assets_zone on public.assets(zone_id);
create index idx_assets_status on public.assets(status);

-- ---------------------------------------------------------------------
-- REPLENISHMENT REQUESTS  (solicitudes de reposición)
-- ---------------------------------------------------------------------
create table public.replenishment_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.users(id) on delete set null,
  zone_id uuid references public.zones(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  pop_item_id uuid references public.pop_items(id) on delete set null,
  -- El jefe zonal solo solicita el material, sin cantidad; el administrador
  -- define la cantidad al aprobar la solicitud (por eso es nullable aquí).
  requested_quantity integer check (requested_quantity is null or requested_quantity > 0),
  reason text,
  urgency request_urgency not null default 'medium',
  zonal_comment text,
  status replenishment_status not null default 'pending',
  admin_comment text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ACQUISITION REQUESTS  (solicitudes de adquisición de nuevos productos)
-- ---------------------------------------------------------------------
create table public.acquisition_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.users(id) on delete set null,
  zone_id uuid references public.zones(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  product_name text not null,
  category_id uuid references public.pop_categories(id) on delete set null,
  requested_quantity integer not null check (requested_quantity > 0),
  justification text,
  related_event_id uuid references public.events(id) on delete set null,
  urgency request_urgency not null default 'medium',
  attachment_url text,
  status acquisition_status not null default 'pending',
  admin_comment text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  estimated_purchase_date date,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SUPPLIERS  (proveedores de la empresa — exclusivo de administrador)
-- ---------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- nombre comercial
  contact_name text,
  email text,
  phone text,
  address text,
  category text, -- qué provee: Impresos, Rompetráficos, Transporte, Publicidad, etc.
  notes text,
  status supplier_status not null default 'active',
  zone_id uuid references public.zones(id) on delete set null, -- informativo, no restringe acceso (Proveedores es solo-admin)
  zone_city text, -- ciudad/detalle dentro de la zona (ej. Naranjal, Huaquillas)
  business_name text, -- razón social
  ruc text,
  provider_type text, -- tipo de proveedor: Impresión, Publicidad, Impresión y publicidad, Otro
  services text, -- servicios que ofrece
  coverage text, -- cobertura / ciudades que atiende
  payment_method text, -- forma de pago: Contado, Credito, Transferencia, Tarjeta, Otro
  delivery_time text, -- tiempo de entrega estimado
  issues_invoice boolean, -- si emite factura
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- EXPENSES  (gastos de la empresa — exclusivo de administrador)
-- ---------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category expense_category not null default 'otros',
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  supplier_id uuid references public.suppliers(id) on delete set null,
  zone_id uuid references public.zones(id) on delete set null,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expenses_date on public.expenses(expense_date);
create index idx_expenses_category on public.expenses(category);

-- ---------------------------------------------------------------------
-- AUDIT LOGS  (historial de movimientos / auditoría global)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action_type audit_action not null,
  module text not null,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------
create index idx_users_zone on public.users(zone_id);
create index idx_stores_zone on public.stores(zone_id);
create index idx_stores_manager on public.stores(zonal_manager_id);
create index idx_pop_items_category on public.pop_items(category_id);
create index idx_pop_items_status on public.pop_items(status);
create index idx_assignments_store on public.inventory_assignments(store_id);
create index idx_assignments_item on public.inventory_assignments(pop_item_id);
create index idx_movements_item on public.inventory_movements(pop_item_id);
create index idx_events_zone on public.events(zone_id);
create index idx_events_store on public.events(store_id);
create index idx_events_status on public.events(status);
create index idx_events_dates on public.events(start_date, end_date);
create index idx_replenishment_zone on public.replenishment_requests(zone_id);
create index idx_replenishment_status on public.replenishment_requests(status);
create index idx_acquisition_zone on public.acquisition_requests(zone_id);
create index idx_acquisition_status on public.acquisition_requests(status);
create index idx_audit_module on public.audit_logs(module);
create index idx_audit_record on public.audit_logs(record_id);
