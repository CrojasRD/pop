'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Store as StoreIcon, AlertTriangle, Wrench, Plus, Search } from 'lucide-react';
import { Select, Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/Table';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { updateAssignmentDetail, setAssignmentStatus, setAssignmentQuantity } from '@/actions/inventory.actions';
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

/**
 * Categorías de material de consumo (no tienen un "estado" físico como
 * dañado/en mantenimiento — lo que importa es cuánto se entregó). Para
 * estas, la matriz muestra un campo numérico en vez del selector de estado.
 */
export const QUANTITY_CATEGORIES = new Set(['Certificados', 'Dípticos', 'Sobres', 'Tarjetas', 'Volantes']);

/** Mismo orden de columnas que usa la matriz: prioritarios primero, luego el resto alfabético. */
export function orderZoneItems(items: PopItem[]): PopItem[] {
  const priority = items
    .filter((i) => PRIORITY_CODES.includes(i.internal_code))
    .sort((a, b) => PRIORITY_CODES.indexOf(a.internal_code) - PRIORITY_CODES.indexOf(b.internal_code));
  const rest = items
    .filter((i) => !PRIORITY_CODES.includes(i.internal_code))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...priority, ...rest];
}

const HEADER_ROW1_H = 24; // px — fila de categoría
const HEADER_ROW2_H = 44; // px — fila de nombre de material

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
    <div className="flex flex-col items-center gap-0.5">
      <select
        value={status}
        disabled={pending}
        onChange={handleChange}
        className={cn(
          'w-full appearance-none rounded-full border-0 px-2 py-1 text-center text-[11px] font-medium leading-none focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60',
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
    return <span className="text-[11px] text-slate-300">—</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center justify-center gap-0.5 rounded-full border border-dashed border-slate-300 px-2 py-1 text-[10px] text-slate-400 hover:border-brand-400 hover:text-brand-600"
        title="Agregar material a esta joyería"
      >
        <Plus size={10} />
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
    <div className="flex flex-col items-center gap-0.5">
      <select
        defaultValue=""
        disabled={pending}
        onChange={handleChange}
        onBlur={() => !pending && setOpen(false)}
        autoFocus
        className="w-full rounded-full border border-slate-300 bg-white px-1.5 py-1 text-center text-[10px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60"
      >
        <option value="" disabled>Elegir…</option>
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

/** Celda numérica para materiales de consumo (volantes, tarjetas, certificados, dípticos, sobres). */
function EditableQuantityCell({ assignment }: { assignment: InventoryAssignment }) {
  const router = useRouter();
  const [value, setValue] = useState(String(assignment.assigned_quantity));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commit() {
    const n = Number(value);
    if (value.trim() === '' || !Number.isInteger(n) || n < 0) {
      setValue(String(assignment.assigned_quantity));
      setError('Cantidad inválida');
      return;
    }
    if (n === assignment.assigned_quantity) return;
    setError(null);
    startTransition(async () => {
      const res = await updateAssignmentDetail(assignment.id, { assigned_quantity: n });
      if (res.error) {
        setValue(String(assignment.assigned_quantity));
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-12 rounded-md border border-slate-200 bg-white px-1 py-1 text-center text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60 sm:w-14"
      />
      {error ? <span className="text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}

/** Igual que CreateStatusCell pero pide una cantidad en vez de un estado. Solo admin puede crearla. */
function CreateQuantityCell({ storeId, popItemId, canCreate }: { storeId: string; popItemId: string; canCreate: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canCreate) {
    return <span className="text-[11px] text-slate-300">—</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center justify-center gap-0.5 rounded-full border border-dashed border-slate-300 px-2 py-1 text-[10px] text-slate-400 hover:border-brand-400 hover:text-brand-600"
        title="Registrar cantidad entregada"
      >
        <Plus size={10} />
      </button>
    );
  }

  function commit() {
    const n = Number(value);
    if (value.trim() === '' || !Number.isInteger(n) || n <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await setAssignmentQuantity({ storeId, popItemId, quantity: n });
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <input
        type="number"
        min={1}
        step={1}
        autoFocus
        inputMode="numeric"
        placeholder="0"
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (pending) return;
          if (!value.trim()) setOpen(false);
          else commit();
        }}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="w-12 rounded-md border border-slate-300 bg-white px-1 py-1 text-center text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60 sm:w-14"
      />
      {error ? <span className="text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}

function StatusLegend() {
  const entries: { key: string; label: string }[] = [
    ...EDITABLE_STATUSES.map((s) => ({ key: s, label: statusLabel(s) })),
    { key: 'none', label: 'No cuenta' }
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
      {entries.map((e) => (
        <span key={e.key} className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', e.key === 'none' ? 'bg-slate-200' : statusColor(e.key).split(' ')[0])} />
          {e.label}
        </span>
      ))}
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

  const orderedItems = useMemo(() => orderZoneItems(items), [items]);

  // Agrupa columnas consecutivas por categoría para un encabezado de dos niveles.
  const categoryGroups = useMemo(() => {
    const groups: { name: string; items: PopItem[] }[] = [];
    for (const it of orderedItems) {
      const catName = it.category?.name ?? 'Otros';
      const last = groups[groups.length - 1];
      if (last && last.name === catName) last.items.push(it);
      else groups.push({ name: catName, items: [it] });
    }
    return groups;
  }, [orderedItems]);

  const [zoneId, setZoneId] = useState(isAdmin ? zones[0]?.id ?? '' : user.zone_id ?? '');
  const showAll = isAdmin && zoneId === 'all';
  const [query, setQuery] = useState('');

  const zoneNameById = useMemo(() => new Map(zones.map((z) => [z.id, z.name])), [zones]);

  const zoneStores = useMemo(() => {
    const base = showAll
      ? [...stores].sort((a, b) => {
          const zoneCompare = (zoneNameById.get(a.zone_id ?? '') ?? '').localeCompare(zoneNameById.get(b.zone_id ?? '') ?? '');
          return zoneCompare !== 0 ? zoneCompare : a.name.localeCompare(b.name);
        })
      : stores.filter((s) => s.zone_id === zoneId).sort((a, b) => a.name.localeCompare(b.name));

    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter((s) => s.name.toLowerCase().includes(q) || (s.code ?? '').toLowerCase().includes(q));
  }, [stores, zoneId, showAll, zoneNameById, query]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {isAdmin ? (
          <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="w-full sm:w-64">
            <option value="all">Todas las zonas</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </Select>
        ) : (
          <p className="text-sm font-medium text-slate-700">{currentZone?.name ?? 'Tu zona'}</p>
        )}

        <div className="relative w-full sm:w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar joyería o código…" className="pl-8" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label={showAll ? 'Joyerías totales' : 'Joyerías en la zona'} value={zoneStores.length} icon={StoreIcon} />
        <MetricCard label="Joyerías con daños" value={storesWithDamage} icon={AlertTriangle} tone={storesWithDamage > 0 ? 'danger' : 'default'} />
        <MetricCard label="Activos dañados" value={totalDamaged} icon={Wrench} tone={totalDamaged > 0 ? 'warning' : 'default'} />
      </div>

      <div className="flex flex-col gap-1">
        <StatusLegend />
        <p className="text-xs text-slate-400">
          Certificados, Dípticos, Sobres, Tarjetas y Volantes se registran como cantidad entregada, no como estado.
        </p>
      </div>

      {zoneStores.length === 0 ? (
        <EmptyState message={showAll ? 'No hay joyerías registradas.' : 'No hay joyerías registradas en esta zona.'} />
      ) : (
        <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 sm:max-h-[72vh]">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 top-0 z-30 min-w-[130px] whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:min-w-[190px] sm:px-3"
                >
                  Joyería
                </th>
                {showAll ? (
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 min-w-[100px] whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:min-w-[130px] sm:px-3"
                  >
                    Zona
                  </th>
                ) : null}
                {categoryGroups.map((g, gi) => (
                  <th
                    key={g.name + gi}
                    colSpan={g.items.length}
                    className="sticky z-20 border-b border-r border-slate-200 bg-slate-100 px-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                    style={{ top: 0, height: HEADER_ROW1_H }}
                  >
                    {g.name}
                  </th>
                ))}
                {rowActions ? (
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Acciones
                  </th>
                ) : null}
              </tr>
              <tr>
                {orderedItems.map((it) => (
                  <th
                    key={it.id}
                    title={it.name}
                    className="sticky z-20 w-[74px] border-b border-r border-slate-100 bg-slate-50 px-1 py-1.5 text-center text-[10.5px] font-medium leading-tight text-slate-500 sm:w-[92px] sm:px-1.5"
                    style={{ top: HEADER_ROW1_H, height: HEADER_ROW2_H }}
                  >
                    {it.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zoneStores.map((s, rowIndex) => (
                <tr key={s.id} className={cn('border-t border-slate-100 hover:bg-brand-50/40', rowIndex % 2 === 1 && 'bg-slate-50/50')}>
                  <td
                    className={cn(
                      'sticky left-0 z-10 truncate whitespace-nowrap border-r border-slate-200 px-2 py-2 text-xs font-medium text-brand-700 sm:px-3 sm:text-sm',
                      rowIndex % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                    )}
                  >
                    {s.code ? `${s.code} · ` : ''}{s.name}
                    {s.status === 'inactive' ? <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Inactiva</span> : null}
                  </td>
                  {showAll ? (
                    <td className="whitespace-nowrap border-r border-slate-100 px-2 py-2 text-xs text-slate-500 sm:px-3 sm:text-sm">
                      {zoneNameById.get(s.zone_id ?? '') ?? '—'}
                    </td>
                  ) : null}
                  {orderedItems.map((it) => {
                    const a = cellMap.get(`${s.id}:${it.id}`);
                    const isQuantityItem = QUANTITY_CATEGORIES.has(it.category?.name ?? '');
                    return (
                      <td key={it.id} className="border-r border-slate-100 px-1 py-1.5 text-center">
                        {a ? (
                          isQuantityItem ? (
                            <EditableQuantityCell assignment={a} />
                          ) : (
                            <EditableStatusCell assignment={a} />
                          )
                        ) : isQuantityItem ? (
                          <CreateQuantityCell storeId={s.id} popItemId={it.id} canCreate={isAdmin} />
                        ) : (
                          <CreateStatusCell storeId={s.id} popItemId={it.id} canCreate={isAdmin} />
                        )}
                      </td>
                    );
                  })}
                  {rowActions ? <td className="whitespace-nowrap px-3 py-2">{rowActions(s)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
