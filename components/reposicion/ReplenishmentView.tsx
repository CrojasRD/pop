'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { formatDate } from '@/lib/utils';
import { createReplenishmentRequest, reviewReplenishmentRequest, deliverReplenishmentRequest } from '@/actions/replenishment.actions';
import type { AppUser, PopItem, ReplenishmentRequest, Store, Zone } from '@/lib/types';

export function ReplenishmentView({
  requests,
  zones,
  stores,
  popItems,
  user
}: {
  requests: ReplenishmentRequest[];
  zones: Zone[];
  stores: Store[];
  popItems: PopItem[];
  user: AppUser;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [reviewing, setReviewing] = useState<ReplenishmentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [approvalQty, setApprovalQty] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const filtered = useMemo(
    () => requests.filter((r) => statusFilter === 'all' || r.status === statusFilter),
    [requests, statusFilter]
  );

  const exportRows = filtered.map((r) => ({
    Joyería: r.store?.name ?? '',
    Material: r.pop_item?.name ?? '',
    Cantidad: r.requested_quantity ?? 'Por definir (admin)',
    Urgencia: r.urgency,
    Estado: r.status,
    Solicitado: formatDate(r.created_at)
  }));

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = Object.fromEntries(formData.entries());
    const result = await createReplenishmentRequest(input);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setShowCreate(false);
      router.refresh();
    }
  }

  async function handleReview(decision: 'approved' | 'rejected') {
    if (!reviewing) return;
    setApprovalError(null);
    if (decision === 'approved') {
      const qty = Number(approvalQty);
      if (!approvalQty || !Number.isInteger(qty) || qty < 1) {
        setApprovalError('Indica la cantidad a aprobar (mayor a 0)');
        return;
      }
    }
    setLoading(true);
    await reviewReplenishmentRequest(reviewing.id, decision, comment, decision === 'approved' ? Number(approvalQty) : undefined);
    setLoading(false);
    setReviewing(null);
    setComment('');
    setApprovalQty('');
    router.refresh();
  }

  async function handleDeliver() {
    if (!reviewing) return;
    setLoading(true);
    await deliverReplenishmentRequest(reviewing.id);
    setLoading(false);
    setReviewing(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48">
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobada</option>
          <option value="rejected">Rechazada</option>
          <option value="delivered">Entregada</option>
        </Select>
        <div className="flex gap-2">
          {user.role === 'admin' ? (
            <ExportButtons rows={exportRows} fileName="solicitudes-reposicion" title="Solicitudes de Reposición" />
          ) : null}
          <Button onClick={() => setShowCreate(true)}><Plus size={14} /> Nueva solicitud</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No hay solicitudes de reposición." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Joyería</Th>
              <Th>Material</Th>
              <Th>Cantidad</Th>
              <Th>Urgencia</Th>
              <Th>Estado</Th>
              <Th>Fecha</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((r) => (
              <Tr key={r.id}>
                <Td>{r.store?.name ?? '—'}</Td>
                <Td>{r.pop_item?.name ?? '—'}</Td>
                <Td>{r.requested_quantity ?? <span className="text-slate-400">Por definir</span>}</Td>
                <Td><Badge status={r.urgency} /></Td>
                <Td><Badge status={r.status} /></Td>
                <Td>{formatDate(r.created_at)}</Td>
                <Td>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReviewing(r);
                      setComment(r.admin_comment ?? '');
                      setApprovalQty(r.requested_quantity ? String(r.requested_quantity) : '');
                      setApprovalError(null);
                    }}
                  >
                    Ver
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Nueva solicitud de reposición">
        <form action={handleCreate} className="space-y-4">
          <FormField label="Zona">
            {user.role === 'zonal_manager' ? (
              <>
                <Select defaultValue={user.zone_id ?? ''} disabled>
                  <option value={user.zone_id ?? ''}>{zones.find((z) => z.id === user.zone_id)?.name ?? '—'}</option>
                </Select>
                <input type="hidden" name="zone_id" value={user.zone_id ?? ''} />
              </>
            ) : (
              <Select name="zone_id" required defaultValue="">
                <option value="" disabled>Selecciona una zona</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </Select>
            )}
          </FormField>
          <FormField label="Joyería">
            <Select name="store_id" required defaultValue="">
              <option value="" disabled>Selecciona una joyería</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Material POP">
            <Select name="pop_item_id" required defaultValue="">
              <option value="" disabled>Selecciona un material</option>
              {popItems.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>
          <p className="text-xs text-slate-400 -mt-1">
            No necesitas indicar cantidad: el administrador la define al aprobar tu solicitud.
          </p>
          <FormField label="Nivel de urgencia">
            <Select name="urgency" defaultValue="medium">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </Select>
          </FormField>
          <FormField label="Motivo de la reposición">
            <Textarea name="reason" rows={2} required />
          </FormField>
          <FormField label="Comentario adicional (opcional)">
            <Textarea name="zonal_comment" rows={2} />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar solicitud'}</Button>
          </div>
        </form>
      </Dialog>

      {reviewing ? (
        <Dialog open onClose={() => setReviewing(null)} title="Detalle de solicitud">
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-slate-400">Joyería</dt><dd>{reviewing.store?.name}</dd></div>
              <div><dt className="text-slate-400">Material</dt><dd>{reviewing.pop_item?.name}</dd></div>
              <div><dt className="text-slate-400">Cantidad</dt><dd>{reviewing.requested_quantity ?? 'Por definir (el administrador la asigna al aprobar)'}</dd></div>
              <div><dt className="text-slate-400">Urgencia</dt><dd><Badge status={reviewing.urgency} /></dd></div>
            </dl>
            <p className="text-slate-600"><span className="font-medium">Motivo:</span> {reviewing.reason}</p>
            {reviewing.zonal_comment ? <p className="text-slate-600"><span className="font-medium">Comentario:</span> {reviewing.zonal_comment}</p> : null}

            {user.role === 'admin' && reviewing.status === 'pending' ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <FormField label="Cantidad a aprobar">
                  <Input
                    type="number"
                    min={1}
                    value={approvalQty}
                    onChange={(e) => setApprovalQty(e.target.value)}
                    placeholder="Cantidad que se entregará a la joyería"
                  />
                </FormField>
                <Textarea placeholder="Comentario del administrador" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
                {approvalError ? <p className="text-xs text-red-600">{approvalError}</p> : null}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleReview('approved')} disabled={loading}>Aprobar</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReview('rejected')} disabled={loading}>Rechazar</Button>
                </div>
              </div>
            ) : null}

            {user.role === 'admin' && reviewing.status === 'approved' ? (
              <div className="border-t border-slate-100 pt-3">
                <Button size="sm" onClick={handleDeliver} disabled={loading}>Registrar entrega (mueve inventario)</Button>
              </div>
            ) : null}

            {reviewing.status !== 'pending' && reviewing.admin_comment ? (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{reviewing.admin_comment}</div>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
