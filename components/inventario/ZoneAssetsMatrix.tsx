'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Store as StoreIcon, AlertTriangle, Wrench } from 'lucide-react';
import { Select } from '@/components/ui/Input';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { updateAssignmentDetail } from '@/actions/inventory.actions';
import { cn, statusColor, statusLabel } from '@/lib/utils';
import type { AppUser, InventoryAssignment, PopItem, Store, Zone } from '@/lib/types';

/** Orden real de columnas, tal como en la hoja de control de activos por zona. */
const ITEM_ORDER = ['ACR-001', 'HAB-001', 'RT-000', 'RT-001', 'RT-002', 'RT-003', 'RT-004', 'RT-005'];

/** Estados que tiene sentido asignar a un material ya instalado en una joyería. */
const EDITABLE_STATUSES = ['good', 'damaged', 'maintenance'] as const;

function EditableStatusCell({ assignment }: { assignment: InventoryAssignment }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(assignment.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const prev = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const res = await updateAssignmentDetail(assignment.id, { status: next });
      if (res.error) {
        setStatus(prev);
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      <select
        value={status}
        disabled={pending}
        onChange={handleChange}
        className={cn(
          'appearance-none rounded-full border-0 px-2.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60',
          statusColor(status)
        )}
      >
        {EDITABLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>
      {error ? <span className="text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}

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
                      {a ? <EditableStatusCell assignment={a} /> : <span className="text-xs text-slate-400">No cuenta</span>}
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
