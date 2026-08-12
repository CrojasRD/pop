-- =====================================================================
-- Funciones de operación de inventario (transaccionales, SECURITY DEFINER)
-- Se invocan desde las Server Actions vía supabase.rpc(...). Solo admin.
-- =====================================================================

-- Asigna material POP desde bodega a una joyería -------------------------
create or replace function public.assign_pop_item(
  p_pop_item_id uuid,
  p_store_id uuid,
  p_quantity integer,
  p_delivery_date date,
  p_notes text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item public.pop_items%rowtype;
  v_zone_id uuid;
  v_assignment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede asignar inventario';
  end if;

  select * into v_item from public.pop_items where id = p_pop_item_id for update;
  if not found then raise exception 'Material POP no encontrado'; end if;
  if v_item.warehouse_quantity < p_quantity then
    raise exception 'Stock insuficiente en bodega (% disponibles)', v_item.warehouse_quantity;
  end if;

  select zone_id into v_zone_id from public.stores where id = p_store_id;

  -- pop_items.assigned_quantity y warehouse_quantity se recalculan solos
  -- (ver 07_triggers.sql) al insertar esta fila — no se tocan a mano aquí.
  insert into public.inventory_assignments (pop_item_id, store_id, zone_id, assigned_quantity, delivery_date, status, notes, created_by)
  values (p_pop_item_id, p_store_id, v_zone_id, p_quantity, p_delivery_date, 'in_stock', p_notes, auth.uid())
  returning id into v_assignment_id;

  insert into public.inventory_movements (pop_item_id, store_id, assignment_id, movement_type, quantity, previous_quantity, new_quantity, notes, created_by)
  values (p_pop_item_id, p_store_id, v_assignment_id, 'delivery', p_quantity, v_item.warehouse_quantity, v_item.warehouse_quantity - p_quantity, p_notes, auth.uid());

  perform public.log_audit('deliver', 'inventory', v_assignment_id, null,
    jsonb_build_object('pop_item_id', p_pop_item_id, 'store_id', p_store_id, 'quantity', p_quantity));

  return v_assignment_id;
end;
$$;

-- Registra devolución de material asignado --------------------------------
create or replace function public.return_pop_item(
  p_assignment_id uuid,
  p_quantity integer,
  p_notes text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_assignment public.inventory_assignments%rowtype;
  v_item public.pop_items%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede registrar devoluciones';
  end if;

  select * into v_assignment from public.inventory_assignments where id = p_assignment_id for update;
  if not found then raise exception 'Asignación no encontrada'; end if;
  if p_quantity > v_assignment.assigned_quantity then
    raise exception 'La cantidad a devolver excede la cantidad asignada';
  end if;

  select * into v_item from public.pop_items where id = v_assignment.pop_item_id for update;

  -- pop_items.assigned_quantity y warehouse_quantity se recalculan solos
  -- (ver 07_triggers.sql) al actualizar esta fila — no se tocan a mano aquí.
  update public.inventory_assignments
    set assigned_quantity = assigned_quantity - p_quantity,
        return_date = current_date,
        status = case when assigned_quantity - p_quantity <= 0 then 'out_of_stock' else status end,
        notes = coalesce(p_notes, notes)
    where id = p_assignment_id;

  insert into public.inventory_movements (pop_item_id, store_id, assignment_id, movement_type, quantity, previous_quantity, new_quantity, notes, created_by)
  values (v_item.id, v_assignment.store_id, p_assignment_id, 'return', p_quantity, v_item.warehouse_quantity, v_item.warehouse_quantity + p_quantity, p_notes, auth.uid());

  perform public.log_audit('update', 'inventory', p_assignment_id, null,
    jsonb_build_object('return_quantity', p_quantity));
end;
$$;

-- Da de baja material (desde bodega o desde una asignación) ----------------
create or replace function public.write_off_pop_item(
  p_pop_item_id uuid,
  p_quantity integer,
  p_from text, -- 'warehouse' | 'assigned' | 'repair'
  p_notes text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_item public.pop_items%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede dar de baja materiales';
  end if;

  select * into v_item from public.pop_items where id = p_pop_item_id for update;
  if not found then raise exception 'Material POP no encontrado'; end if;

  if p_from = 'warehouse' then
    if v_item.warehouse_quantity < p_quantity then raise exception 'Stock insuficiente en bodega'; end if;
    update public.pop_items set warehouse_quantity = warehouse_quantity - p_quantity, inactive_quantity = inactive_quantity + p_quantity where id = p_pop_item_id;
  elsif p_from = 'repair' then
    if v_item.repair_quantity < p_quantity then raise exception 'Stock insuficiente en reparación'; end if;
    update public.pop_items set repair_quantity = repair_quantity - p_quantity, inactive_quantity = inactive_quantity + p_quantity where id = p_pop_item_id;
  else
    if v_item.assigned_quantity < p_quantity then raise exception 'Stock insuficiente asignado'; end if;
    update public.pop_items set assigned_quantity = assigned_quantity - p_quantity, inactive_quantity = inactive_quantity + p_quantity where id = p_pop_item_id;
  end if;

  insert into public.inventory_movements (pop_item_id, movement_type, quantity, notes, created_by)
  values (p_pop_item_id, 'write_off', p_quantity, p_notes, auth.uid());

  perform public.log_audit('delete', 'inventory', p_pop_item_id, null, jsonb_build_object('write_off_quantity', p_quantity, 'from', p_from));
end;
$$;

-- Marca una solicitud de reposición como entregada y mueve inventario -----
create or replace function public.deliver_replenishment(
  p_request_id uuid,
  p_notes text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_req public.replenishment_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede entregar reposiciones';
  end if;

  select * into v_req from public.replenishment_requests where id = p_request_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if v_req.status <> 'approved' then raise exception 'La solicitud debe estar aprobada antes de entregar'; end if;
  if v_req.requested_quantity is null or v_req.requested_quantity <= 0 then
    raise exception 'La solicitud no tiene una cantidad asignada por el administrador';
  end if;

  perform public.assign_pop_item(v_req.pop_item_id, v_req.store_id, v_req.requested_quantity, current_date, p_notes);

  update public.replenishment_requests
    set status = 'delivered', delivered_at = now()
    where id = p_request_id;

  perform public.log_audit('deliver', 'replenishment_requests', p_request_id, null, jsonb_build_object('quantity', v_req.requested_quantity));
end;
$$;
