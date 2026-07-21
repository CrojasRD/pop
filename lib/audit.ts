import { createClient } from '@/lib/supabase/server';
import type { AuditAction } from '@/lib/types';

/**
 * Registra una acción en audit_logs vía la función SECURITY DEFINER log_audit().
 * Debe llamarse desde server actions inmediatamente después de cada mutación relevante.
 */
export async function logAudit(params: {
  action: AuditAction;
  module: string;
  recordId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  const supabase = createClient();
  const { error } = await supabase.rpc('log_audit', {
    p_action: params.action,
    p_module: params.module,
    p_record_id: params.recordId ?? null,
    p_old_value: params.oldValue ?? null,
    p_new_value: params.newValue ?? null
  });
  if (error) console.error('No se pudo registrar auditoría:', error.message);
}
