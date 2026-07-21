import { LogOut } from 'lucide-react';
import { logout } from '@/actions/auth.actions';
import { Badge } from '@/components/ui/Badge';
import type { AppUser } from '@/lib/types';

export function Topbar({ user }: { user: AppUser }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <p className="text-sm font-semibold text-slate-800">Hola, {user.full_name.split(' ')[0]}</p>
        <p className="text-xs text-slate-400">
          {user.role === 'admin' ? 'Administrador' : `Jefe Zonal · ${user.zone?.name ?? ''}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge status={user.role} />
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <LogOut size={14} /> Salir
          </button>
        </form>
      </div>
    </header>
  );
}
