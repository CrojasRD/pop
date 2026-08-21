'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { truckStopSchema, truckStopBaseSchema } from '@/lib/validations';
import type { ActionResult } from './inventory.actions';

// El cronograma del camión lo administra únicamente el Administrador.
// Los jefes zonales solo tienen acceso de lectura (impuesto también por RLS).

export async function createTruckStop(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = truckStopSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = createClient();
  const payload = {
    ...parsed.data,
    notes: parsed.data.notes || null,
    status: 'scheduled' as const,
    created_by: admin.id
  };

  const { data, error } = await supabase.from('truck_schedule').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await logAudit({ action: 'create', module: 'truck_schedule', recordId: data.id, newValue: payload });

  // Cada actividad del camión genera también su evento correspondiente en
  // Eventos, para que aparezca ahí sin tener que cargarla dos veces.
  const eventPayload = {
    event_name: payload.activity_name,
    start_date: payload.start_date,
    end_date: payload.end_date,
    zone_id: payload.zone_id,
    status: 'approved' as const,
    description: 'Generado automáticamente desde el cronograma del camión.',
    justification: payload.notes || null,
    truck_stop_id: data.id,
    created_by: admin.id,
    approved_by: admin.id,
    approved_at: new Date().toISOString()
  };
  const { data: event, error: eventError } = await supabase.from('events').insert(eventPayload).select('id').single();
  if (!eventError && event) {
    await logAudit({ action: 'create', module: 'events', recordId: event.id, newValue: eventPayload });
  }

  revalidatePath('/camion');
  revalidatePath('/eventos');
  return { success: true };
}

export async function updateTruckStop(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();

  const { data: existing } = await supabase.from('truck_schedule').select('*').eq('id', id).single();
  if (!existing) return { error: 'Actividad no encontrada' };

  const parsed = truckStopBaseSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const payload = { ...parsed.data, notes: parsed.data.notes ?? existing.notes };
  const { error } = await supabase.from('truck_schedule').update(payload).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'truck_schedule', recordId: id, oldValue: existing, newValue: payload });

  // Refleja los mismos cambios en el evento generado por esta actividad.
  const eventPayload: Record<string, unknown> = {};
  if (payload.activity_name !== undefined) eventPayload.event_name = payload.activity_name;
  if (payload.start_date !== undefined) eventPayload.start_date = payload.start_date;
  if (payload.end_date !== undefined) eventPayload.end_date = payload.end_date;
  if (payload.zone_id !== undefined) eventPayload.zone_id = payload.zone_id;
  if (payload.notes !== undefined) eventPayload.justification = payload.notes;
  if (Object.keys(eventPayload).length > 0) {
    await supabase.from('events').update(eventPayload).eq('truck_stop_id', id);
  }

  revalidatePath('/camion');
  revalidatePath('/eventos');
  return { success: true };
}

export async function cancelTruckStop(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('truck_schedule').update({ status: 'cancelled' }).eq('id', id);
  if (error) return { error: error.message };

  await logAudit({ action: 'update', module: 'truck_schedule', recordId: id, newValue: { status: 'cancelled' } });
  await supabase.from('events').update({ status: 'cancelled' }).eq('truck_stop_id', id);
  revalidatePath('/camion');
  revalidatePath('/eventos');
  return { success: true };
}

export async function deleteTruckStop(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createClient();
  // Sin `.select()`, Supabase/RLS no informa si el delete realmente afectó
  // alguna fila — si la política bloquea el borrado, responde "éxito" sin
  // haber borrado nada.
  const { error, data } = await supabase.from('truck_schedule').delete().eq('id', id).select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'No se pudo eliminar la actividad. Verifica que tengas permisos de administrador o que todavía exista.' };
  }

  await logAudit({ action: 'delete', module: 'truck_schedule', recordId: id });
  revalidatePath('/camion');
  revalidatePath('/eventos');
  return { success: true };
}

export async function bulkDeleteTruckStops(ids: string[]): Promise<ActionResult & { deletedCount?: number }> {
  await requireAdmin();
  if (!ids.length) return { error: 'No hay actividades seleccionadas' };

  const supabase = createClient();
  // Sin `.select()`, Supabase/RLS no informa si el delete realmente afectó
  // alguna fila — pedimos las filas eliminadas para poder detectarlo.
  const { error, data } = await supabase.from('truck_schedule').delete().in('id', ids).select('id');
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'No se pudo eliminar ninguna actividad. Verifica que tengas permisos de administrador.' };
  }

  for (const row of data) {
    await logAudit({ action: 'delete', module: 'truck_schedule', recordId: row.id });
  }
  revalidatePath('/camion');
  revalidatePath('/eventos');
  return { success: true, deletedCount: data.length };
}
