'use client';

import { useState } from 'react';
import { List, MapPinned } from 'lucide-react';
import { StoreTable } from '@/components/joyerias/StoreTable';
import { ZoneAssetsMatrix } from '@/components/inventario/ZoneAssetsMatrix';
import type { AppUser, InventoryAssignment, PopItem, Store, Zone } from '@/lib/types';

export function JoyeriasPageTabs({
  user,
  stores,
  zones,
  managers,
  zoneItems,
  assignments,
  isAdmin
}: {
  user: AppUser;
  stores: Store[];
  zones: Zone[];
  managers: AppUser[];
  zoneItems: PopItem[];
  assignments: InventoryAssignment[];
  isAdmin: boolean;
}) {
  const [view, setView] = useState<'lista' | 'zonas'>('lista');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setView('lista')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === 'lista' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          <List size={14} /> Lista
        </button>
        <button
          onClick={() => setView('zonas')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === 'zonas' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
        >
          <MapPinned size={14} /> Control por zona
        </button>
      </div>

      {view === 'lista' ? (
        <StoreTable stores={stores} zones={zones} managers={managers} isAdmin={isAdmin} />
      ) : (
        <ZoneAssetsMatrix user={user} zones={zones} stores={stores} items={zoneItems} assignments={assignments} />
      )}
    </div>
  );
}
