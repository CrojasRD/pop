-- =====================================================================
-- Sincronización automática de cantidades agregadas de pop_items.
-- Antes, cada Server Action/función que tocaba inventory_assignments tenía
-- que recordar actualizar pop_items.assigned_quantity y warehouse_quantity
-- a mano — fácil de olvidar y fuente de desfases (varios de los flujos ya
-- existentes, como bulkUpdateAssignments y updateAssignmentDetail, nunca
-- lo hacían). Con estos triggers, ambos campos quedan siempre correctos
-- sin que la aplicación tenga que calcular nada.
-- =====================================================================

-- 1) warehouse_quantity siempre se deriva de:
--    total_quantity - assigned_quantity - repair_quantity - inactive_quantity
create or replace function public.sync_pop_item_warehouse_quantity()
returns trigger
language plpgsql
as $$
begin
  new.warehouse_quantity := greatest(
    new.total_quantity - new.assigned_quantity - new.repair_quantity - new.inactive_quantity,
    0
  );
  return new;
end;
$$;

drop trigger if exists trg_sync_pop_item_warehouse on public.pop_items;
create trigger trg_sync_pop_item_warehouse
  before insert or update of total_quantity, assigned_quantity, repair_quantity, inactive_quantity
  on public.pop_items
  for each row
  execute function public.sync_pop_item_warehouse_quantity();

-- 2) assigned_quantity de pop_items siempre es la suma real de
--    inventory_assignments.assigned_quantity para ese material. Se
--    recalcula automáticamente al crear, editar o borrar una asignación
--    (dispara en cascada el trigger de warehouse_quantity de arriba).
create or replace function public.sync_pop_item_assigned_quantity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    update public.pop_items
      set assigned_quantity = coalesce((select sum(assigned_quantity) from public.inventory_assignments where pop_item_id = old.pop_item_id), 0)
      where id = old.pop_item_id;
    return old;
  end if;

  update public.pop_items
    set assigned_quantity = coalesce((select sum(assigned_quantity) from public.inventory_assignments where pop_item_id = new.pop_item_id), 0)
    where id = new.pop_item_id;

  if TG_OP = 'UPDATE' and old.pop_item_id is distinct from new.pop_item_id then
    update public.pop_items
      set assigned_quantity = coalesce((select sum(assigned_quantity) from public.inventory_assignments where pop_item_id = old.pop_item_id), 0)
      where id = old.pop_item_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_pop_item_assigned on public.inventory_assignments;
create trigger trg_sync_pop_item_assigned
  after insert or delete or update of assigned_quantity, pop_item_id
  on public.inventory_assignments
  for each row
  execute function public.sync_pop_item_assigned_quantity();

-- 3) Backfill (idempotente): corrige cualquier desfase acumulado por el
--    cálculo manual anterior, usando la suma real como fuente de verdad.
update public.pop_items p
  set assigned_quantity = coalesce((select sum(ia.assigned_quantity) from public.inventory_assignments ia where ia.pop_item_id = p.id), 0);
