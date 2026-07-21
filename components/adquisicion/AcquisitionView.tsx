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
import { createAcquisitionRequest, reviewAcquisitionRequest } from '@/actions/acquisition.actions';
import type { AcquisitionRequest, AcquisitionStatus, AppUser, PopCategory, Store, Zone } from '@/lib/types';

export function AcquisitionView({
  requests,
  zones,
  stores,
  categories,
  user
}: {
  requests: AcquisitionRequest[];
  zones: Zone[];
  stores: Store[];
  categories: PopCategory[];
  user: AppUser;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [reviewing, setReviewing] = useState<AcquisitionRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const filtered = useMemo(
    () => requests.filter((r) => statusFilter === 'all' || r.status === statusFilter),
    [requests, statusFilter]
  );

  const exportRows = filtered.map((r) => ({
    Producto: r.product_name,
    Categoría: r.category?.name ?? '',
    Cantidad: r.requested_quantity,
    Urgencia: r.urgency,
    Estado: r.status,
    Solicitado: formatDate(r.created_at)
  }));

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = Object.fromEntries(formData.entries());
    const result = await createAcquisitionRequest(input);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setShowCreate(false);
      router.refresh();
    }
  }

  async function handleReview(status: AcquisitionStatus) {
    if (!reviewing) return;
    setLoading(true);
    await reviewAcquisitionRequest(reviewing.id, status, comment);
    setLoading(false);
    setReviewing(null);
    setComment('');
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
          <option value="in_purchase">En compra</option>
          <option value="received">Recibida</option>
        </Select>
        <div className="flex gap-2">
          {user.role === 'admin' ? (
            <ExportButtons rows={exportRows} fileName="solicitudes-adquisicion" title="Solicitudes de Adquisición" />
          ) : null}
          <Button onClick={() => setShowCreate(true)}><Plus size={14} /> Nueva solicitud</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No hay solicitudes de adquisición." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Producto</Th>
              <Th>Categoría</Th>
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
                <Td>{r.product_name}</Td>
                <Td>{r.category?.name ?? '—'}</Td>
                <Td>{r.requested_quantity}</Td>
                <Td><Badge status={r.urgency} /></Td>
                <Td><Badge status={r.status} /></Td>
                <Td>{formatDate(r.created_at)}</Td>
                <Td>
                  <Button size="sm" variant="outline" onClick={() => { setReviewing(r); setComment(r.admin_comment ?? ''); }}>
                    Ver
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Nueva solicitud de adquisición">
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
          <FormField label="Joyería relacionada (opcional)">
            <Select name="store_id" defaultValue="">
              <option value="">Sin joyería específica</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Nombre del producto">
            <Input name="product_name" required />
          </FormField>
          <FormField label="Categoría">
            <Select name="category_id" required defaultValue="">
              <option value="" disabled>Selecciona una categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Cantidad solicitada">
            <Input name="requested_quantity" type="number" min={1} required />
          </FormField>
          <FormField label="Nivel de urgencia">
            <Select name="urgency" defaultValue="medium">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </Select>
          </FormField>
          <FormField label="Justificación">
            <Textarea name="justification" rows={2} required />
          </FormField>
          <FormField label="Archivo adjunto o referencia (URL, opcional)">
            <Input name="attachment_url" placeholder="https://…" />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar solicitud'}</Button>
          </div>
        </form>
      </Dialog>

      {reviewing ? (
        <Dialog open onClose={() => setReviewing(null)} title="Detalle de solicitud de adquisición">
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-slate-400">Producto</dt><dd>{reviewing.product_name}</dd></div>
              <div><dt className="text-slate-400">Categoría</dt><dd>{reviewing.category?.name}</dd></div>
              <div><dt className="text-slate-400">Cantidad</dt><dd>{reviewing.requested_quantity}</dd></div>
              <div><dt className="text-slate-400">Urgencia</dt><dd><Badge status={reviewing.urgency} /></dd></div>
            </dl>
            <p className="text-slate-600"><span className="font-medium">Justificación:</span> {reviewing.justification}</p>

            {user.role === 'admin' && reviewing.status === 'pending' ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <Textarea placeholder="Comentario del administrador" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleReview('approved')} disabled={loading}>Aprobar</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReview('rejected')} disabled={loading}>Rechazar</Button>
                </div>
              </div>
            ) : null}

            {user.role === 'admin' && reviewing.status === 'approved' ? (
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <Button size="sm" onClick={() => handleReview('in_purchase')} disabled={loading}>Marcar en compra</Button>
              </div>
            ) : null}

            {user.role === 'admin' && reviewing.status === 'in_purchase' ? (
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <Button size="sm" onClick={() => handleReview('received')} disabled={loading}>Marcar recibida</Button>
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
