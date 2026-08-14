-- =====================================================================
-- Row Level Security (RLS)
-- Regla general: admin ve/gestiona todo. jefe zonal solo su zone_id.
-- =====================================================================

alter table public.zones enable row level security;
alter table public.users enable row level security;
alter table public.stores enable row level security;
alter table public.pop_categories enable row level security;
alter table public.pop_items enable row level security;
alter table public.inventory_assignments enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.events enable row level security;
alter table public.truck_schedule enable row level security;
alter table public.assets enable row level security;
alter table public.replenishment_requests enable row level security;
alter table public.acquisition_requests enable row level security;
alter table public.suppliers enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;

-- ZONES ------------------------------------------------------------------
create policy zones_select on public.zones for select
  using (public.is_admin() or id = public.current_user_zone_id());
create policy zones_write on public.zones for all
  using (public.is_admin()) with check (public.is_admin());

-- USERS --------------------------------------------------------------------
create policy users_select_self on public.users for select
  using (public.is_admin() or id = auth.uid());
create policy users_write_admin on public.users for insert
  with check (public.is_admin());
create policy users_update on public.users for update
  using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());
create policy users_delete_admin on public.users for delete
  using (public.is_admin());

-- STORES -------------------------------------------------------------------
create policy stores_select on public.stores for select
  using (public.is_admin() or zone_id = public.current_user_zone_id());
create policy stores_write_admin on public.stores for insert
  with check (public.is_admin());
create policy stores_update_admin on public.stores for update
  using (public.is_admin()) with check (public.is_admin());
create policy stores_delete_admin on public.stores for delete
  using (public.is_admin());

-- POP CATEGORIES -------------------------------------------------------------
create policy pop_categories_select on public.pop_categories for select
  using (true);
create policy pop_categories_write_admin on public.pop_categories for all
  using (public.is_admin()) with check (public.is_admin());

-- POP ITEMS ------------------------------------------------------------------
-- Los jefes zonales ven el catálogo global (para poder solicitar), pero solo
-- pueden ver el detalle de asignación a través de inventory_assignments.
create policy pop_items_select on public.pop_items for select
  using (true);
create policy pop_items_write_admin on public.pop_items for insert
  with check (public.is_admin());
create policy pop_items_update_admin on public.pop_items for update
  using (public.is_admin()) with check (public.is_admin());
create policy pop_items_delete_admin on public.pop_items for delete
  using (public.is_admin());

-- INVENTORY ASSIGNMENTS -------------------------------------------------------
-- Eliminar asignaciones sigue siendo exclusivo del administrador. Crear una
-- asignación nueva (mover stock de bodega), actualizar el estado físico y la
-- cantidad registrada en una joyería lo puede hacer también el jefe zonal,
-- limitado a su propia zona.
create policy assignments_select on public.inventory_assignments for select
  using (public.is_admin() or zone_id = public.current_user_zone_id());
create policy assignments_write on public.inventory_assignments for insert
  with check (public.is_admin() or zone_id = public.current_user_zone_id());
create policy assignments_update on public.inventory_assignments for update
  using (public.is_admin() or zone_id = public.current_user_zone_id())
  with check (public.is_admin() or zone_id = public.current_user_zone_id());
create policy assignments_delete_admin on public.inventory_assignments for delete
  using (public.is_admin());

-- INVENTORY MOVEMENTS ----------------------------------------------------------
create policy movements_select on public.inventory_movements for select
  using (
    public.is_admin()
    or store_id in (select id from public.stores where zone_id = public.current_user_zone_id())
  );
create policy movements_write_admin on public.inventory_movements for insert
  with check (public.is_admin());

-- EVENTS -------------------------------------------------------------------
create policy events_select on public.events for select
  using (public.is_admin() or zone_id = public.current_user_zone_id());
create policy events_insert on public.events for insert
  with check (
    public.is_admin()
    or (public.current_user_role() = 'zonal_manager' and zone_id = public.current_user_zone_id())
  );
create policy events_update on public.events for update
  using (
    public.is_admin()
    or (zone_id = public.current_user_zone_id() and status = 'pending' and created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or (zone_id = public.current_user_zone_id() and created_by = auth.uid())
  );
create policy events_delete_admin on public.events for delete
  using (public.is_admin());

-- TRUCK SCHEDULE -------------------------------------------------------------
-- Solo el administrador programa el camión; los jefes zonales solo ven el
-- cronograma de su propia zona (misma regla de scoping que el resto del sistema).
create policy truck_schedule_select on public.truck_schedule for select
  using (public.is_admin() or zone_id = public.current_user_zone_id());
create policy truck_schedule_write_admin on public.truck_schedule for insert
  with check (public.is_admin());
create policy truck_schedule_update_admin on public.truck_schedule for update
  using (public.is_admin()) with check (public.is_admin());
create policy truck_schedule_delete_admin on public.truck_schedule for delete
  using (public.is_admin());

-- ASSETS -----------------------------------------------------------------
-- Tanto el administrador como el jefe zonal pueden registrar y actualizar
-- activos de su propia zona (ubicación, responsable, estado). Solo el
-- administrador puede eliminar un activo del registro.
create policy assets_select on public.assets for select
  using (public.is_admin() or zone_id = public.current_user_zone_id());
create policy assets_insert on public.assets for insert
  with check (
    public.is_admin()
    or (public.current_user_role() = 'zonal_manager' and zone_id = public.current_user_zone_id())
  );
create policy assets_update on public.assets for update
  using (public.is_admin() or zone_id = public.current_user_zone_id())
  with check (public.is_admin() or zone_id = public.current_user_zone_id());
create policy assets_delete_admin on public.assets for delete
  using (public.is_admin());

-- REPLENISHMENT REQUESTS --------------------------------------------------------
create policy replenishment_select on public.replenishment_requests for select
  using (public.is_admin() or zone_id = public.current_user_zone_id());
create policy replenishment_insert on public.replenishment_requests for insert
  with check (
    public.is_admin()
    or (public.current_user_role() = 'zonal_manager' and zone_id = public.current_user_zone_id())
  );
-- Solo el administrador aprueba/rechaza/marca entrega (cambia status).
-- El jefe zonal solo puede editar mientras está pendiente y es su propia solicitud
-- (p.ej. agregar comentarios), nunca cambiar el status a aprobado/rechazado.
create policy replenishment_update_admin on public.replenishment_requests for update
  using (public.is_admin())
  with check (public.is_admin());
create policy replenishment_update_owner on public.replenishment_requests for update
  using (requested_by = auth.uid() and status = 'pending')
  with check (requested_by = auth.uid() and status = 'pending');
create policy replenishment_delete_admin on public.replenishment_requests for delete
  using (public.is_admin());

-- ACQUISITION REQUESTS -----------------------------------------------------------
create policy acquisition_select on public.acquisition_requests for select
  using (public.is_admin() or zone_id = public.current_user_zone_id());
create policy acquisition_insert on public.acquisition_requests for insert
  with check (
    public.is_admin()
    or (public.current_user_role() = 'zonal_manager' and zone_id = public.current_user_zone_id())
  );
create policy acquisition_update_admin on public.acquisition_requests for update
  using (public.is_admin())
  with check (public.is_admin());
create policy acquisition_update_owner on public.acquisition_requests for update
  using (requested_by = auth.uid() and status = 'pending')
  with check (requested_by = auth.uid() and status = 'pending');
create policy acquisition_delete_admin on public.acquisition_requests for delete
  using (public.is_admin());

-- SUPPLIERS ---------------------------------------------------------------
-- Exclusivo de administrador: los jefes zonales no ven proveedores.
create policy suppliers_all_admin on public.suppliers for all
  using (public.is_admin()) with check (public.is_admin());

-- EXPENSES ------------------------------------------------------------------
-- Exclusivo de administrador: información financiera de la empresa.
create policy expenses_all_admin on public.expenses for all
  using (public.is_admin()) with check (public.is_admin());

-- AUDIT LOGS -----------------------------------------------------------------
create policy audit_select on public.audit_logs for select
  using (public.is_admin());
create policy audit_insert on public.audit_logs for insert
  with check (true); -- se inserta vía función security definer log_audit()
