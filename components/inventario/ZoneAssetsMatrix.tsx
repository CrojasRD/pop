'use client';

import { useMemo, useState } from 'react';
import { Store as StoreIcon, AlertTriangle, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { MetricCard } from '@/components/dashboard/MetricCard';
import type { AppUser, InventoryAssignment, PopItem, Store, Zone } from '@/lib/types';

/** Orden real de columnas, tal como en la hoja de control de activos por zona. */
const ITEM_ORDER = ['ACR-001', 'HAB-001', 'RT-000', 'RT-001', 'RT-002', 'RT-003', 'RT-004', 'RT-005'];

export function ZoneAssetsMatrix({
  user,
  zones,
  stores,
  items,
  assignments
}: {
  user: AppUser;
  zones: Zone[];
  stores: Store[];
  items: PopItem[];
  assignments: InventoryAssignment[];
}) {
  const isAdmin = user.role === 'admin';

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => ITEM_ORDER.indexOf(a.internal_code) - ITEM_ORDER.indexOf(b.internal_code)),
    [items]
  );

  const [zoneId, setZoneId] = useState(isAdmin ? zones[0]?.id ?? '' : user.zone_id ?? '');

  const zoneStores = useMemo(
    () =>
      stores
        .filter((s) => s.zone_id === zoneId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [stores, zoneId]
  );

  const cellMap = useMemo(() => {
    const map = new Map<string, InventoryAssignment>();
    for (const a of assignments) {
      map.set(`${a.store_id}:${a.pop_item_id}`, a);
    }
    return map;
  }, [assignments]);

  const storesWithDamage = zoneStores.filter((s) =>
    orderedItems.some((it) => cellMap.get(`${s.id}:${it.id}`)?.status === 'damaged')
  ).length;

  const totalDamaged = zoneStores.reduce(
    (acc, s) => acc + orderedItems.filter((it) => cellMap.get(`${s.id}:${it.id}`)?.status === 'damaged').length,
    0
  );

  const currentZone = zones.find((z) => z.id === zoneId);

  if (!isAdmin && !zoneId) {
    return <EmptyState message="Tu usuario no tiene una zona asignada." />;
  }

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="w-64">
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </Select>
      ) : (
        <p className="text-sm font-medium text-slate-700">{currentZone?.name ?? 'Tu zona'}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Joyerías en la zona" value={zoneStores.length} icon={StoreIcon} />
        <MetricCard label="Joyerías con daños" value={storesWithDamage} icon={AlertTriangle} tone={storesWithDamage > 0 ? 'danger' : 'default'} />
        <MetricCard label="Activos dañados" value={totalDamaged} icon={Wrench} tone={totalDamaged > 0 ? 'warning' : 'default'} />
      </div>

      {zoneStores.length === 0 ? (
        <EmptyState message="No hay joyerías registradas en esta zona." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th className="whitespace-nowrap">Joyería</Th>
              {orderedItems.map((it) => (
                <Th key={it.id} className="whitespace-nowrap">{it.name}</Th>
              ))}
            </tr>
          </Thead>
          <tbody>
            {zoneStores.map((s) => (
              <Tr key={s.id}>
                <Td className="whitespace-nowrap font-medium text-brand-700">
                  {s.code ? `${s.code} · ` : ''}{s.name}
                </Td>
                {orderedItems.map((it) => {
                  const a = cellMap.get(`${s.id}:${it.id}`);
                  return (
                    <Td key={it.id}>
                      {a ? <Badge status={a.status} /> : <span className="text-xs text-slate-400">No cuenta</span>}
                    </Td>
                  );
                })}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
