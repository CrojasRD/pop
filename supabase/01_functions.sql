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
create trigger trg_acquisition_updated_at before update on public.acquisition_requests
  for each row execute function public.set_updated_at();

-- Helpers de rol / zona (SECURITY DEFINER para evitar recursión en RLS) ---
create or replace function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_user_zone_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select zone_id from public.users where id = auth.uid();
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

-- Registro de auditoría genérico (llamado desde server actions) ----------
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
  insert into public.audit_logs (user_id, action_type, module, record_id, old_value, new_value)
  values (auth.uid(), p_action, p_module, p_record_id, p_old_value, p_new_value)
  returning id into v_id;
  return v_id;
end;
$$;

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

create trigger trg_pop_items_status before insert or update
  of warehouse_quantity, assigned_quantity, repair_quantity, inactive_quantity
  on public.pop_items
  for each row execute function public.recalc_pop_item_status();
