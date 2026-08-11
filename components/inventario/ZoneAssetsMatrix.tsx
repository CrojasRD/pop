'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Store as StoreIcon, AlertTriangle, Wrench, Plus } from 'lucide-react';
import { Select } from '@/components/ui/Input';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { updateAssignmentDetail, setAssignmentStatus } from '@/actions/inventory.actions';
import { cn, statusColor, statusLabel } from '@/lib/utils';
import type { AppUser, InventoryAssignment, PopItem, Store, Zone } from '@/lib/types';

/**
 * Orden preferente de columnas: primero los materiales que ya se controlaban
 * (acrílicos, habladores, rompetráficos), luego el resto del catálogo
 * (volantes, tarjetas, certificados, etc.) alfabéticamente.
 */
const PRIORITY_CODES = ['ACR-001', 'HAB-001', 'RT-000', 'RT-001', 'RT-002', 'RT-003', 'RT-004', 'RT-005'];

/** Estados que tiene sentido asignar a un material físico en una joyería. */
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

/** Celda para joyerías que todavía no "cuentan" con ese material. Solo admin puede crearla. */
function CreateStatusCell({ storeId, popItemId, canCreate }: { storeId: string; popItemId: string; canCreate: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canCreate) {
    return <span className="text-xs text-slate-400">No cuenta</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600"
        title="Agregar material a esta joyería"
      >
        <Plus size={12} /> No cuenta
      </button>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value;
    if (!status) return;
    setError(null);
    startTransition(async () => {
      const res = await setAssignmentStatus({ storeId, popItemId, status });
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      <select
        defaultValue=""
        disabled={pending}
        onChange={handleChange}
        onBlur={() => !pending && setOpen(false)}
        autoFocus
        className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60"
      >
        <option value="" disabled>Elegir estado…</option>
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
  assignments,
  rowActions
}: {
  user: AppUser;
  zones: Zone[];
  stores: Store[];
  items: PopItem[];
  assignments: InventoryAssignment[];
  /** Columna extra opcional al final de cada fila (ej. editar/desactivar joyería). Solo la usa Joyerías. */
  rowActions?: (store: Store) => ReactNode;
}) {
  const isAdmin = user.role === 'admin';

  const orderedItems = useMemo(() => {
    const priority = items
      .filter((i) => PRIORITY_CODES.includes(i.internal_code))
      .sort((a, b) => PRIORITY_CODES.indexOf(a.internal_code) - PRIORITY_CODES.indexOf(b.internal_code));
    const rest = items
      .filter((i) => !PRIORITY_CODES.includes(i.internal_code))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...priority, ...rest];
  }, [items]);

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
              {rowActions ? <Th className="whitespace-nowrap">Acciones</Th> : null}
            </tr>
          </Thead>
          <tbody>
            {zoneStores.map((s) => (
              <Tr key={s.id}>
                <Td className="whitespace-nowrap font-medium text-brand-700">
                  {s.code ? `${s.code} · ` : ''}{s.name}
                  {s.status === 'inactive' ? <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Inactiva</span> : null}
                </Td>
                {orderedItems.map((it) => {
                  const a = cellMap.get(`${s.id}:${it.id}`);
                  return (
                    <Td key={it.id}>
                      {a ? (
                        <EditableStatusCell assignment={a} />
                      ) : (
                        <CreateStatusCell storeId={s.id} popItemId={it.id} canCreate={isAdmin} />
                      )}
                    </Td>
                  );
                })}
                {rowActions ? <Td className="whitespace-nowrap">{rowActions(s)}</Td> : null}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
