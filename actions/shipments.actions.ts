'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { shipmentSchema } from '@/lib/validations';
import { QUANTITY_CATEGORIES } from '@/lib/constants';
import type { ActionResult } from './inventory.actions';

export async function createShipment(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const { store_ids, zone_id, items, notes } = parsed.data;

  // La zona de cada renglón se toma de la propia joyería, igual que en
  // Reposición — así un mismo envío puede llegar a joyerías de distintas
  // zonas sin pedir ese dato aparte. Si se eligió una zona en vez de
  // joyerías puntuales, se resuelve aquí a todas sus joyerías activas.
  const isZoneMode = store_ids.length === 0;
  let storesData: { id: string; zone_id: string | null }[] | null;
  if (!isZoneMode) {
    const { data, error: storesError } = await supabase.from('stores').select('id, zone_id').in('id', store_ids);
    if (storesError) return { error: storesError.message };
    if (!data || data.length !== store_ids.length) {
      return { error: 'Una o más joyerías no son válidas o no tienes acceso a ellas' };
    }
    storesData = data;
  } else {
    const { data, error: zoneError } = await supabase
      .from('stores')
      .select('id, zone_id')
      .eq('zone_id', zone_id)
      .eq('status', 'active');
    if (zoneError) return { error: zoneError.message };
    if (!data || data.length === 0) {
      return { error: 'Esa zona no tiene joyerías activas' };
    }
    storesData = data;
  }

  // En modo "Por zona" la cantidad escrita es el total a repartir entre las
  // joyerías de la zona (ej. 5000 entre 10 joyerías = 500 cada una), no la
  // cantidad que recibe cada una — a diferencia de "Por joyería(s)", donde
  // cada joyería elegida a mano recibe la cantidad completa.
  if (isZoneMode) {
    const n = storesData.length;
    const tooSmall = items.find((item) => item.quantity < n);
    if (tooSmall) {
      return {
        error: `La cantidad de un material es menor a la cantidad de joyerías activas de la zona (${n}); algunas quedarían en 0. Ingresa un total mayor o elige una zona con menos joyerías.`
      };
    }
  }

  const batchId = randomUUID();
  const n = storesData.length;
  const payloads = storesData.flatMap((s, storeIdx) =>
    items.map((item) => {
      let quantity = item.quantity;
      if (isZoneMode) {
        const base = Math.floor(item.quantity / n);
        const remainder = item.quantity % n;
        quantity = base + (storeIdx < remainder ? 1 : 0);
      }
      return {
        batch_id: batchId,
        zone_id: s.zone_id,
        store_id: s.id,
        pop_item_id: item.pop_item_id,
        quantity,
        status: 'sent' as const,
        notes: notes || null,
        sent_by: admin.id
      };
    })
  );

  const { data, error } = await supabase.from('material_shipments').insert(payloads).select('id');
  if (error) return { error: error.message };

  for (const row of data ?? []) {
    await logAudit({ action: 'create', module: 'material_shipments', recordId: row.id, newValue: { store_ids, zone_id: zone_id || null, items, notes } });
  }
  revalidatePath('/envios');
  return { success: true };
}

export async function confirmShipmentDelivery(ids: string[], deliveryNotes?: string): Promise<ActionResult & { deliveredCount?: number }> {
  const user = await requireUser();
  if (!ids.length) return { error: 'No hay envíos seleccionados' };

  const supabase = createClient();
  const payload = {
    status: 'delivered' as const,
    delivered_by: user.id,
    delivered_at: new Date().toISOString(),
    delivery_notes: deliveryNotes || null
  };

  // RLS ya limita esto: admin puede confirmar cualquiera, el jefe zonal solo
  // los de su propia zona y mientras sigan en 'sent'.
  const { data, error } = await supabase
    .from('material_shipments')
    .update(payload)
    .in('id', ids)
    .eq('status', 'sent')
    .select('id, store_id, zone_id, pop_item_id, quantity');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'No se pudo confirmar la entrega. Verifica que siga pendiente y sea de tu zona.' };
  }

  for (const row of data) {
    await logAudit({ action: 'deliver', module: 'material_shipments', recordId: row.id, newValue: payload });
  }

  // Refleja la entrega en el inventario de la joyería: solo para materiales
  // "de consumo" (Volantes, Tarjetas, Certificados, Dípticos, Sobres), que en
  // el panel de Joyerías se registran como una cantidad y no como un estado
  // físico. La cantidad entregada se SUMA a lo que la joyería ya tuviera
  // registrado (varias entregas a lo largo del tiempo se van acumulando).
  const popItemIds = Array.from(new Set(data.map((r) => r.pop_item_id).filter((id): id is string => !!id)));
  if (popItemIds.length > 0) {
    const { data: popItemsData } = await supabase
      .from('pop_items')
      .select('id, category:pop_categories(name)')
      .in('id', popItemIds);
    const quantityItemIds = new Set(
      (popItemsData ?? [])
        .filter((p: any) => QUANTITY_CATEGORIES.has(p.category?.name ?? ''))
        .map((p: any) => p.id as string)
    );

    for (const row of data) {
      if (!row.pop_item_id || !row.store_id || !quantityItemIds.has(row.pop_item_id)) continue;

      const { data: existing } = await supabase
        .from('inventory_assignments')
        .select('id, assigned_quantity')
        .eq('store_id', row.store_id)
        .eq('pop_item_id', row.pop_item_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('inventory_assignments')
          .update({ assigned_quantity: existing.assigned_quantity + row.quantity })
          .eq('id', existing.id);
      } else {
        await supabase.from('inventory_assignments').insert({
          pop_item_id: row.pop_item_id,
          store_id: row.store_id,
          zone_id: row.zone_id,
          assigned_quantity: row.quantity,
          status: 'good',
          notes: 'Recibido por envío',
          created_by: user.id
        });
      }
    }
  }

  revalidatePath('/envios');
  revalidatePath('/joyerias');
  revalidatePath('/inventario');
  return { success: true, deliveredCount: data.length };
}

export async function deleteShipment(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error, data } = await supabase.from('material_shipments').delete().eq('id', id).select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'No se pudo eliminar el envío. Verifica que tengas permisos de administrador o que todavía exista.' };
  }

  await logAudit({ action: 'delete', module: 'material_shipments', recordId: id });
  revalidatePath('/envios');
  return { success: true };
}

/** Elimina de una vez todos los renglones de un mismo envío (batch_id). */
export async function deleteShipmentBatch(batchId: string): Promise<ActionResult & { deletedCount?: number }> {
  await requireAdmin();
  const supabase = createClient();
  const { error, data } = await supabase.from('material_shipments').delete().eq('batch_id', batchId).select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'No se pudo eliminar el envío. Verifica que tengas permisos de administrador o que todavía exista.' };
  }

  for (const row of data) {
    await logAudit({ action: 'delete', module: 'material_shipments', recordId: row.id, newValue: { batch_id: batchId } });
  }
  revalidatePath('/envios');
  return { success: true, deletedCount: data.length };
}

/** Elimina absolutamente todos los envíos registrados (todos los bloques). */
export async function deleteAllShipments(): Promise<ActionResult & { deletedCount?: number }> {
  await requireAdmin();
  const supabase = createClient();
  // El filtro `.neq('id', ...)` es un truco para poder pedir "todas las filas"
  // sin un `where` explícito, ya que Supabase no permite un delete() sin filtro.
  const { error, data } = await supabase
    .from('material_shipments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id');
  if (error) return { error: error.message };

  for (const row of data ?? []) {
    await logAudit({ action: 'delete', module: 'material_shipments', recordId: row.id, newValue: { bulk: true } });
  }
  revalidatePath('/envios');
  return { success: true, deletedCount: data?.length ?? 0 };
}
