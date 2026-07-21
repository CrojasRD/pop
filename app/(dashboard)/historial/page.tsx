import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HistorialTable } from '@/components/reportes/HistorialTable';

export default async function HistorialPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, user:users(*)')
    .order('created_at', { ascending: false })
    .limit(500);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Historial de movimientos</h1>
        <p className="text-sm text-slate-500">Auditoría de todas las acciones importantes del sistema.</p>
      </div>
      <HistorialTable logs={(logs as any) ?? []} />
    </div>
  );
}
