'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PackagePlus, PackageCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { assignPopItemToStore, returnPopItem, writeOffPopItem } from '@/actions/inventory.actions';
import type { PopItem, Store, InventoryAssignment } from '@/lib/types';

export function InventoryActions({ item, stores }: { item: PopItem; stores: Store[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<'assign' | 'writeoff' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await assignPopItemToStore({
      popItemId: item.id,
      storeId: String(formData.get('store_id')),
      quantity: Number(formData.get('quantity')),
      deliveryDate: String(formData.get('delivery_date')),
      notes: String(formData.get('notes') ?? '')
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setDialog(null);
      router.refresh();
    }
  }

  async function handleWriteOff(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await writeOffPopItem({
      popItemId: item.id,
      quantity: Number(formData.get('quantity')),
      from: formData.get('from') as any,
      notes: String(formData.get('notes') ?? '')
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setDialog(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setDialog('assign')}>
        <PackagePlus size={14} /> Asignar a joyería
      </Button>
      <Button size="sm" variant="danger" onClick={() => setDialog('writeoff')}>
        <Trash2 size={14} /> Registrar baja
      </Button>

      <Dialog open={dialog === 'assign'} onClose={() => setDialog(null)} title="Asignar material a joyería">
        <form action={handleAssign} className="space-y-4">
          <FormField label="Joyería">
            <Select name="store_id" required defaultValue="">
              <option value="" disabled>Selecciona una joyería</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Cantidad">
            <Input name="quantity" type="number" min={1} max={item.warehouse_quantity} required />
          </FormField>
          <p className="text-xs text-slate-400">Disponible en bodega: {item.warehouse_quantity}</p>
          <FormField label="Fecha de entrega">
            <Input name="delivery_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </FormField>
          <FormField label="Observaciones">
            <Textarea name="notes" rows={2} />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Confirmar asignación'}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={dialog === 'writeoff'} onClose={() => setDialog(null)} title="Registrar baja de material">
        <form action={handleWriteOff} className="space-y-4">
          <FormField label="Origen">
            <Select name="from" required defaultValue="warehouse">
              <option value="warehouse">Bodega</option>
              <option value="assigned">Asignado</option>
              <option value="repair">Reparación</option>
            </Select>
          </FormField>
          <FormField label="Cantidad">
            <Input name="quantity" type="number" min={1} required />
          </FormField>
          <FormField label="Motivo">
            <Textarea name="notes" rows={2} placeholder="Describe el motivo de la baja…" />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button type="submit" variant="danger" disabled={loading}>{loading ? 'Guardando…' : 'Confirmar baja'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function ReturnAssignmentButton({ assignment }: { assignment: InventoryAssignment }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReturn(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await returnPopItem({
      assignmentId: assignment.id,
      quantity: Number(formData.get('quantity')),
      notes: String(formData.get('notes') ?? '')
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PackageCheck size={14} /> Devolución
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Registrar devolución" widthClass="max-w-md">
        <form action={handleReturn} className="space-y-4">
          <FormField label={`Cantidad a devolver (asignada: ${assignment.assigned_quantity})`}>
            <Input name="quantity" type="number" min={1} max={assignment.assigned_quantity} required />
          </FormField>
          <FormField label="Observaciones">
            <Textarea name="notes" rows={2} />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Confirmar devolución'}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
