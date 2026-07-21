'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Store, CalendarDays, RefreshCcw,
  ShoppingCart, Users, BarChart3, History, Settings, Truck, Boxes,
  Building2, DollarSign
} from 'lucide-react';
import { NAV_ITEMS } from '@/lib/permissions';
import type { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICONS: Record<string, any> = {
  LayoutDashboard, Package, Store, CalendarDays, RefreshCcw,
  ShoppingCart, Users, BarChart3, History, Settings, Truck, Boxes,
  Building2, DollarSign
};

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => (item.roles as readonly string[]).includes(role));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
          OC
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 leading-tight">Orocash</p>
          <p className="text-xs text-slate-400 leading-tight">Inventario POP</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4 text-xs text-slate-400">
        © {new Date().getFullYear()} Orocash. Uso interno.
      </div>
    </aside>
  );
}
