import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PasswordForm } from '@/components/reportes/PasswordForm';
import { CategoryManager } from '@/components/reportes/CategoryManager';

export default async function ConfiguracionPage() {
  const user = await requireUser();
  const supabase = createClient();
  const { data: categories } = await supabase.from('pop_categories').select('*').order('name');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Configuración</h1>
        <p className="text-sm text-slate-500">Preferencias de tu cuenta y parámetros del sistema.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Mi cuenta</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-xs text-slate-400">Nombre</dt><dd>{user.full_name}</dd></div>
            <div><dt className="text-xs text-slate-400">Correo</dt><dd>{user.email}</dd></div>
            <div><dt className="text-xs text-slate-400">Rol</dt><dd>{user.role === 'admin' ? 'Administrador' : 'Jefe Zonal'}</dd></div>
            <div><dt className="text-xs text-slate-400">Zona</dt><dd>{user.zone?.name ?? '—'}</dd></div>
          </dl>
          <PasswordForm />
        </CardContent>
      </Card>

      {user.role === 'admin' ? (
        <Card>
          <CardHeader><CardTitle>Categorías de materiales POP</CardTitle></CardHeader>
          <CardContent>
            <CategoryManager categories={(categories as any) ?? []} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
