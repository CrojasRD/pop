'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { MultiSearchSelect } from '@/components/ui/MultiSearchSelect';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { createShipment, confirmShipmentDelivery, deleteShipment } from '@/actions/shipments.actions';
import { canCreateShipment, canConfirmShipmentDelivery } from '@/lib/permissions';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { AppUser, MaterialShipment, PopItem, Store } from '@/lib/types';

interface ItemRow {
  pop_item_id: string;
  quantity: string;
}

export function ShipmentsView({
  shipments,
  stores,
  popItems,
  user
}: {
  shipments: MaterialShipment[];
  stores: Store[];
  popItems: PopItem[];
  user: AppUser;
}) {
  const router = useRouter();
  const isAdmin = canCreateShipment(user);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([{ pop_item_id: '', quantity: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<MaterialShipment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(
    () => shipments.filter((s) => statusFilter === 'all' || s.status === statusFilter),
    [shipments, statusFilter]
  );

  const batches = useMemo(() => {
    const byBatch = new Map<string, MaterialShipment[]>();
    filtered.forEach((s) => {
      const list = byBatch.get(s.batch_id) ?? [];
      list.push(s);
      byBatch.set(s.batch_id, list);
    });
    return Array.from(byBatch.entries())
      .map(([batchId, rows]) => ({ batchId, rows }))
      .sort((a, b) => new Date(b.rows[0]?.sent_at ?? 0).getTime() - new Date(a.rows[0]?.sent_at ?? 0).getTime());
  }, [filtered]);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function addItemRow() {
    setItems((prev) => [...prev, { pop_item_id: '', quantity: '' }]);
  }
  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }
  function resetCreateForm() {
    setItems([{ pop_item_id: '', quantity: '' }]);
    setError(null);
  }

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = {
      store_ids: formData.getAll('store_ids'),
      items: JSON.stringify(items.filter((it) => it.pop_item_id && it.quantity)),
      notes: formData.get('notes') ?? undefined
    };
    const result = await createShipment(input);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setShowCreate(false);
      resetCreateForm();
      router.refresh();
    }
  }

  async function handleConfirm(ids: string[]) {
    setConfirmingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    await confirmShipmentDelivery(ids);
    setConfirmingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const result = await deleteShipment(deleteTarget.id);
    setDeleteLoading(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
          <option value="all">Todos los estados</option>
          <option value="sent">Enviado</option>
          <option value="delivered">Entregado</option>
        </Select>
        {isAdmin ? (
          <Button onClick={() => { resetCreateForm(); setShowCreate(true); }}>
            <Plus size={14} /> Nuevo envío
          </Button>
        ) : null}
      </div>

      {batches.length === 0 ? (
        <EmptyState message="No hay envíos registrados." />
      ) : (
        <div className="space-y-3">
          {batches.map(({ batchId, rows }) => {
            const first = rows[0];
            const pendingIds = rows.filter((r) => canConfirmShipmentDelivery(user, r)).map((r) => r.id);
            const anyConfirming = pendingIds.some((id) => confirmingIds.has(id));
            return (
              <details key={batchId} open className="group overflow-hidden rounded-xl border border-slate-200">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                  <span>
                    Envío del {formatDate(first?.sent_at)}
                    {first?.sender?.full_name ? <span className="ml-2 font-normal text-slate-400">— {first.sender.full_name}</span> : null}
                  </span>
                  <span className="flex items-center gap-3 text-xs font-normal text-slate-400">
                    {rows.length} material{rows.length === 1 ? '' : 'es'}
                    {pendingIds.length > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={anyConfirming}
                        onClick={(e) => { e.preventDefault(); handleConfirm(pendingIds); }}
                      >
                        Confirmar todo lo pendiente
                      </Button>
                    ) : null}
                    <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                {first?.notes ? (
                  <p className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500">
                    <span className="font-medium">Nota:</span> {first.notes}
                  </p>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <Thead>
                      <tr>
                        <Th>Joyería</Th>
                        <Th>Zona</Th>
                        <Th>Material</Th>
                        <Th>Cantidad</Th>
                        <Th>Estado</Th>
                        <Th>Entregado</Th>
                        <Th>Acciones</Th>
                      </tr>
                    </Thead>
                    <tbody>
                      {rows.map((r) => {
                        const canConfirm = canConfirmShipmentDelivery(user, r);
                        return (
                          <Tr key={r.id}>
                            <Td className="font-medium text-slate-800">{r.store?.name ?? '—'}</Td>
                            <Td>{r.zone?.name ?? '—'}</Td>
                            <Td>{r.pop_item?.name ?? '—'}</Td>
                            <Td>{r.quantity}</Td>
                            <Td><Badge status={r.status} /></Td>
                            <Td>{r.delivered_at ? formatDateTime(r.delivered_at) : '—'}</Td>
                            <Td>
                              <div className="flex gap-1.5">
                                {canConfirm ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={confirmingIds.has(r.id)}
                                    onClick={() => handleConfirm([r.id])}
                                  >
                                    Marcar entregado
                                  </Button>
                                ) : null}
                                {isAdmin ? (
                                  <Button size="sm" variant="danger" onClick={() => setDeleteTarget(r)}>Eliminar</Button>
                                ) : null}
                              </div>
                            </Td>
                          </Tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <Dialog
        open={showCreate}
        onClose={() => { setShowCreate(false); resetCreateForm(); }}
        title="Nuevo envío"
      >
        <form action={handleCreate} className="space-y-4">
          <FormField label="Joyería(s)">
            <MultiSearchSelect
              name="store_ids"
              placeholder="Escribe para buscar una joyería…"
              emptyLabel="No se encontró ninguna joyería"
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
            />
          </FormField>
          <FormField label="Materiales enviados">
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select
                    value={it.pop_item_id}
                    onChange={(e) => updateItem(idx, { pop_item_id: e.target.value })}
                    className="flex-1"
                  >
                    <option value="">Selecciona un material</option>
                    {popItems.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Cantidad"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    className="w-28"
                  />
                  {items.length > 1 ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => removeItemRow(idx)}>
                      <X size={14} />
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                <Plus size={14} /> Agregar material
              </Button>
            </div>
          </FormField>
          <p className="text-xs text-slate-400 -mt-2">
            Si eliges varias joyerías, cada material se envía a todas ellas.
          </p>
          <FormField label="Nota (opcional)">
            <Textarea name="notes" rows={2} placeholder="Ej: envío por transporte X, referencia de guía…" />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Registrar envío'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Eliminar renglón de envío"
        description={`¿Confirmas eliminar el envío de "${deleteTarget?.pop_item?.name}" a "${deleteTarget?.store?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel={deleteLoading ? 'Eliminando…' : 'Eliminar'}
        danger
        error={deleteError}
      />
    </div>
  );
}
