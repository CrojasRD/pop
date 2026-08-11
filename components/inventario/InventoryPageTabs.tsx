'use client';

import { useState } from 'react';
import { Package, MapPinned } from 'lucide-react';
import { InventoryTable } from '@/components/inventario/InventoryTable';
import { ZoneAssetsMatrix } from '@/components/inventario/ZoneAssetsMatrix';
import type { AppUser, InventoryAssignment, PopCategory, PopItem, Store, Zone } from '@/lib/types';

export function InventoryPageTabs({
  user,
  items,
  categories,
  zones,
  stores,
  zoneItems,
  assignments,
  isAdmin
}: {
  user: AppUser;
  items: PopItem[];
  categories: PopCategory[];
  zones: Zone[];
  stores: Store[];
  zoneItems: PopItem[];
  assignments: InventoryAssignment[];
  isAdmin: boolean;
}) {
  const [view, setView] = useState<'catalogo' | 'zonas'>('catalogo');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setView('catalogo')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === 'catalogo' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          <Package size={14} /> Catálogo
        </button>
        <button
          onClick={() => setView('zonas')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === 'zonas' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          <MapPinned size={14} /> Control por zona
        </button>
      </div>

      {view === 'catalogo' ? (
        <InventoryTable items={items} categories={categories} isAdmin={isAdmin} />
      ) : (
        <ZoneAssetsMatrix user={user} zones={zones} stores={stores} items={zoneItems} assignments={assignments} />
      )}
    </div>
  );
}
