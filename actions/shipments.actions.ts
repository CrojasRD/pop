'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { shipmentSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

export async function createShipment(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const { store_ids, items, notes } = parsed.data;

  // La zona de cada renglón se toma de la propia joyería, igual que en
  // Reposición — así un mismo envío puede llegar a joyerías de distintas
  // zonas sin pedir ese dato aparte.
  const { data: storesData, error: storesError } = await supabase.from('stores').select('id, zone_id').in('id', store_ids);
  if (storesError) return { error: storesError.message };
  if (!storesData || storesData.length !== store_ids.length) {
    return { error: 'Una o más joyerías no son válidas o no tienes acceso a ellas' };
  }

  const batchId = randomUUID();
  const payloads = storesData.flatMap((s) =>
    items.map((item) => ({
      batch_id: batchId,
      zone_id: s.zone_id,
      store_id: s.id,
      pop_item_id: item.pop_item_id,
      quantity: item.quantity,
      status: 'sent' as const,
      notes: notes || null,
      sent_by: admin.id
    }))
  );

  const { data, error } = await supabase.from('material_shipments').insert(payloads).select('id');
  if (error) return { error: error.message };

  for (const row of data ?? []) {
    await logAudit({ action: 'create', module: 'material_shipments', recordId: row.id, newValue: { store_ids, items, notes } });
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
    .select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'No se pudo confirmar la entrega. Verifica que siga pendiente y sea de tu zona.' };
  }

  for (const row of data) {
    await logAudit({ action: 'deliver', module: 'material_shipments', recordId: row.id, newValue: payload });
  }
  revalidatePath('/envios');
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
