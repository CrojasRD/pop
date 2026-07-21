'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { storeSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';
import type { StoreImportRow } from '@/lib/import';

export async function createStore(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    code: parsed.data.code || null,
    email: parsed.data.email || null,
    company: parsed.data.company || null,
    zonal_manager_id: parsed.data.zonal_manager_id || null
  };
  const { data, error } = await supabase.from('stores').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'stores', recordId: data.id, newValue: payload });
  revalidatePath('/joyerias');
  return { success: true };
}

export async function updateStore(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    code: parsed.data.code || null,
    email: parsed.data.email || null,
    company: parsed.data.company || null,
    zonal_manager_id: parsed.data.zonal_manager_id || null
  };
  const { error } = await supabase.from('stores').update(payload).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'stores', recordId: id, newValue: payload });
  revalidatePath('/joyerias');
  return { success: true };
}

export async function toggleStoreStatus(id: string, status: 'active' | 'inactive'): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('stores').update({ status }).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'stores', recordId: id, newValue: { status } });
  revalidatePath('/joyerias');
  return { success: true };
}

export async function bulkImportStores(rows: StoreImportRow[]): Promise<ActionResult & { imported?: number }> {
  await requireAdmin();
  const supabase = createClient();

  const { data: zones } = await supabase.from('zones').select('id, name');
  const zoneMap = new Map((zones ?? []).map((z: any) => [z.name.toLowerCase(), z.id]));

  const payload = rows.map((r) => ({
    code: r.code || null,
    name: r.name,
    city: r.city,
    province: r.province,
    address: r.address || null,
    email: r.email || null,
    phone: r.phone || null,
    company: r.company || null,
    zone_id: zoneMap.get(r.zone_name.toLowerCase()) ?? null,
    status: 'active' as const
  }));

  const { error, count } = await supabase.from('stores').insert(payload, { count: 'exact' });
  if (error) return { error: error.message };

  await logAudit({ action: 'bulk_upload', module: 'stores', newValue: { count: payload.length } });
  revalidatePath('/joyerias');
  return { success: true, imported: count ?? payload.length };
}
