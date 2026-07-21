import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ExpensesView } from '@/components/gastos/ExpensesView';

export default async function GastosPage() {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: expenses }, { data: suppliers }, { data: zones }] = await Promise.all([
    supabase.from('expenses').select('*, supplier:suppliers(*), zone:zones(*)').order('expense_date', { ascending: false }),
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('zones').select('*').order('name')
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Gastos</h1>
        <p className="text-sm text-slate-500">Registro progresivo de los gastos del año. Módulo exclusivo de administrador.</p>
      </div>
      <ExpensesView
        expenses={(expenses as any) ?? []}
        suppliers={(suppliers as any) ?? []}
        zones={(zones as any) ?? []}
      />
    </div>
  );
}
