'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { updateAssignmentDetail } from '@/actions/inventory.actions';
import type { AppUser, InventoryAssignment } from '@/lib/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'good', label: 'Buen estado' },
  { value: 'damaged', label: 'Dañado' },
  { value: 'maintenance', label: 'En mantenimiento' },
  { value: 'in_stock', label: 'En stock' },
  { value: 'out_of_stock', label: 'Sin stock' }
];

/** Fila editable: administrador y jefe zonal (de esta zona) pueden cambiar estado y cantidad. */
function AssignmentRow({ assignment, canEdit }: { assignment: InventoryAssignment; canEdit: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState(assignment.status);
  const [quantity, setQuantity] = useState(assignment.assigned_quantity);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    const result = await updateAssignmentDetail(assignment.id, { status, assigned_quantity: quantity });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setDirty(false);
      router.refresh();
    }
  }

  return (
    <Tr>
      <Td>
        <Link href={`/inventario/${assignment.pop_item?.id}`} className="font-medium text-brand-700 hover:underline">
          {assignment.pop_item?.name ?? '—'}
        </Link>
      </Td>
      <Td>{assignment.pop_item?.category?.name ?? '—'}</Td>
      <Td className="font-mono text-xs">{assignment.pop_item?.internal_code ?? '—'}</Td>
      <Td>
        {canEdit ? (
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => { setQuantity(Number(e.target.value)); setDirty(true); }}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        ) : (
          assignment.assigned_quantity
        )}
      </Td>
      <Td>{formatDate(assignment.delivery_date)}</Td>
      <Td>
        {canEdit ? (
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value as typeof status); setDirty(true); }}
            className="w-40"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        ) : (
          <Badge status={assignment.status} />
        )}
      </Td>
      <Td className="max-w-xs truncate text-xs text-slate-500">{assignment.notes ?? '—'}</Td>
      {canEdit ? (
        <Td>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={!dirty || loading}>
              {loading ? 'Guardando…' : 'Guardar'}
            </Button>
            {error ? <span className="text-xs text-red-600">{error}</span> : null}
          </div>
        </Td>
      ) : null}
    </Tr>
  );
}

export function StoreInventoryTable({
  assignments,
  user,
  storeZoneId
}: {
  assignments: InventoryAssignment[];
  user: AppUser;
  storeZoneId: string | null;
}) {
  const canEdit = user.role === 'admin' || user.zone_id === storeZoneId;

  if (assignments.length === 0) {
    return <EmptyState message="Esta joyería aún no tiene material POP asignado." />;
  }

  return (
    <Table>
      <Thead>
        <tr>
          <Th>Material</Th>
          <Th>Categoría</Th>
          <Th>Código</Th>
          <Th>Cantidad</Th>
          <Th>Entrega</Th>
          <Th>Estado</Th>
          <Th>Notas</Th>
          {canEdit ? <Th></Th> : null}
        </tr>
      </Thead>
      <tbody>
        {assignments.map((a) => (
          <AssignmentRow key={a.id} assignment={a} canEdit={canEdit} />
        ))}
      </tbody>
    </Table>
  );
}
