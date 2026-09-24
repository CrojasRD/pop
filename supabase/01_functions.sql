-- =====================================================================
-- Funciones auxiliares y triggers
-- =====================================================================

-- updated_at automático ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_zones_updated_at before update on public.zones
  for each row execute function public.set_updated_at();
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();
create trigger trg_pop_items_updated_at before update on public.pop_items
  for each row execute function public.set_updated_at();
create trigger trg_assignments_updated_at before update on public.inventory_assignments
  for each row execute function public.set_updated_at();
create trigger trg_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger trg_truck_schedule_updated_at before update on public.truck_schedule
  for each row execute function public.set_updated_at();
create trigger trg_assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
create trigger trg_suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();
create trigger trg_expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger trg_replenishment_updated_at before update on public.replenishment_requests
  for each row execute function public.set_updated_at();
create trigger trg_shipments_updated_at before update on public.material_shipments
  for each row execute function public.set_updated_at();
create trigger trg_activation_materials_updated_at before update on public.activation_materials
  for each row execute function public.set_updated_at();
create trigger trg_acquisition_updated_at before update on public.acquisition_requests
  for each row execute function public.set_updated_at();

-- Helpers de rol / zona (SECURITY DEFINER para evitar recursión en RLS) ---
-- IMPORTANTE: exigen status = 'active'. Sin este filtro, un usuario marcado
-- como inactivo (ej. desde /usuarios) conserva su rol y zona a nivel de RLS
-- mientras su sesión de Supabase Auth siga vigente, pudiendo seguir leyendo
-- o escribiendo datos vía la API de Supabase aunque la app ya le niegue el
-- acceso (requireUser() solo protege las páginas/acciones de Next.js, no la
-- base de datos en sí). Con el filtro, is_admin() y las políticas basadas en
-- zone_id dejan de reconocerlo de inmediato en cuanto status pasa a inactive.
create or replace function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid() and status = 'active';
$$;

create or replace function public.current_user_zone_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select zone_id from public.users where id = auth.uid() and status = 'active';
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'admin';
$$;

-- Alta automática de perfil cuando se crea un usuario en auth.users -------
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, full_name, email, username, role, zone_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'zonal_manager'),
    nullif(new.raw_user_meta_data->>'zone_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_handle_new_auth_user
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Bloquea que un usuario se auto-escale: la policy users_update (RLS) permite
-- a cualquiera editar su propia fila (para poder cambiar su nombre/usuario),
-- pero por sí sola no impide que esa misma fila incluya un role/zone_id/status
-- distinto — cualquier usuario podría, con una llamada directa a la API de
-- Supabase, hacerse admin. Este trigger es el que realmente lo impide,
-- comparando el valor anterior con el nuevo sin importar quién dispare el
-- UPDATE ni qué columnas envíe.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
      or new.zone_id is distinct from old.zone_id
      or new.status is distinct from old.status then
      raise exception 'Solo un administrador puede cambiar el rol, la zona o el estado de un usuario';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_privilege_escalation on public.users;
create trigger trg_prevent_self_privilege_escalation
  before update on public.users
  for each row execute function public.prevent_self_privilege_escalation();

-- Registro de auditoría genérico (llamado desde server actions) ----------
-- NOTA: es SECURITY DEFINER y callable por cualquier usuario autenticado (las
-- server actions lo llaman con el cliente normal, autenticado como el propio
-- usuario que hizo la acción, no con una llave de servicio aparte). No hay
-- forma de distinguir aquí "la app lo llamó justo después de una mutación
-- real" de "alguien lo llamó directo" sin un cambio más grande. Como mitigación
-- parcial, se exige que p_module sea uno de los módulos reales de la app —
-- así no se pueden fabricar entradas para módulos inventados, aunque no evita
-- que alguien registre una acción falsa para un módulo al que sí tiene acceso.
create or replace function public.log_audit(
  p_action audit_action,
  p_module text,
  p_record_id uuid,
  p_old_value jsonb,
  p_new_value jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_module not in (
    'acquisition_requests', 'activation_materials', 'assets', 'auth', 'events',
    'expenses', 'inventory', 'inventory_assignments', 'material_shipments',
    'pop_categories', 'pop_items', 'replenishment_requests', 'stores',
    'suppliers', 'truck_schedule', 'users', 'zones'
  ) then
    raise exception 'Módulo de auditoría no reconocido: %', p_module;
  end if;

  insert into public.audit_logs (user_id, action_type, module, record_id, old_value, new_value)
  values (auth.uid(), p_action, p_module, p_record_id, p_old_value, p_new_value)
  returning id into v_id;
  return v_id;
end;
$$;

-- La policy shipments_update_confirm_delivery deja que el jefe zonal
-- actualice un renglón de su zona en 'sent' sin fijar qué columnas puede
-- tocar; en la práctica confirmShipmentDelivery solo cambia
-- status/delivered_by/delivered_at/delivery_notes. Este trigger es el que
-- realmente impide que, con una llamada directa a la API, se altere también
-- qué material o cuánto se envió/recibió.
create or replace function public.prevent_shipment_field_tampering()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.quantity is distinct from old.quantity
      or new.pop_item_id is distinct from old.pop_item_id
      or new.store_id is distinct from old.store_id
      or new.zone_id is distinct from old.zone_id
      or new.batch_id is distinct from old.batch_id
      or new.sent_by is distinct from old.sent_by
      or new.sent_at is distinct from old.sent_at
      or new.notes is distinct from old.notes then
      raise exception 'Solo un administrador puede modificar los datos del envío; el jefe zonal solo puede confirmar la entrega';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_shipment_field_tampering on public.material_shipments;
create trigger trg_prevent_shipment_field_tampering
  before update on public.material_shipments
  for each row execute function public.prevent_shipment_field_tampering();

-- Recalcula pop_items.status según cantidades -----------------------------
create or replace function public.recalc_pop_item_status()
returns trigger language plpgsql as $$
begin
  if new.warehouse_quantity = new.total_quantity then
    new.status := 'available';
  elsif new.inactive_quantity = new.total_quantity then
    new.status := 'decommissioned';
  elsif new.repair_quantity > 0 and new.assigned_quantity = 0 then
    new.status := 'in_repair';
  elsif new.assigned_quantity > 0 then
    new.status := 'assigned';
  else
    new.status := 'available';
  end if;
  return new;
end;
$$;

-- Nombrado trg_zz_... (no trg_pop_items_status) a propósito: los triggers
-- BEFORE del mismo evento se disparan en orden alfabético de su nombre, y
-- este debe correr DESPUÉS de trg_sync_pop_item_warehouse (07_triggers.sql)
-- para calcular el status con el warehouse_quantity ya recalculado en el
-- mismo UPDATE, no con el valor viejo.
drop trigger if exists trg_pop_items_status on public.pop_items;
create trigger trg_zz_pop_items_status before insert or update
  of warehouse_quantity, assigned_quantity, repair_quantity, inactive_quantity
  on public.pop_items
  for each row execute function public.recalc_pop_item_status();
