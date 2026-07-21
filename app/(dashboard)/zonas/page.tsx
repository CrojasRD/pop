import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ZoneManager } from '@/components/usuarios/ZoneManager';

export default async function ZonasPage() {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: zones }, { data: managers }, { data: stores }] = await Promise.all([
    supabase.from('zones').select('*').order('name'),
    supabase.from('users').select('*').eq('role', 'zonal_manager').order('full_name'),
    supabase.from('stores').select('*').order('name')
  ]);

  return (
    <div className="space-y-5">
      <Link href="/usuarios" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
        <ArrowLeft size={12} /> Volver a usuarios
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Zonas</h1>
        <p className="text-sm text-slate-500">Crea zonas y asigna un jefe zonal responsable a cada una.</p>
      </div>
      <ZoneManager zones={(zones as any) ?? []} managers={(managers as any) ?? []} stores={(stores as any) ?? []} />
    </div>
  );
}
