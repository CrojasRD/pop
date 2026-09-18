import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ActivationMaterialsView } from '@/components/activaciones/ActivationMaterialsView';

export default async function ActivacionesPage() {
  const user = await requireUser();
  const supabase = createClient();

  const { data: materials } = await supabase.from('activation_materials').select('*').order('name');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Materiales para activaciones</h1>
        <p className="text-sm text-slate-500">
          {user.role === 'admin'
            ? 'Registra los materiales que se usan en activaciones y la cantidad disponible de cada uno.'
            : 'Consulta los materiales disponibles para activaciones.'}
        </p>
      </div>
      <ActivationMaterialsView materials={(materials as any) ?? []} user={user} />
    </div>
  );
}
