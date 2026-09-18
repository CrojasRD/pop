'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, FormField } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  createActivationMaterial,
  updateActivationMaterial,
  deleteActivationMaterial
} from '@/actions/activation-materials.actions';
import type { ActivationMaterial, AppUser } from '@/lib/types';

export function ActivationMaterialsView({
  materials,
  user
}: {
  materials: ActivationMaterial[];
  user: AppUser;
}) {
  const router = useRouter();
  const isAdmin = user.role === 'admin';
  const [editing, setEditing] = useState<ActivationMaterial | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ActivationMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = editing && editing !== 'new' ? editing : null;

  function closeForm() {
    setEditing(null);
    setError(null);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = {
      name: formData.get('name'),
      quantity: formData.get('quantity'),
      notes: formData.get('notes') ?? undefined
    };
    const result = current ? await updateActivationMaterial(current.id, input) : await createActivationMaterial(input);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    closeForm();
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setLoading(true);
    setError(null);
    const result = await deleteActivationMaterial(deleting.id);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <div className="flex justify-end">
          <Button onClick={() => setEditing('new')}><Plus size={14} /> Nuevo material</Button>
        </div>
      ) : null}

      {materials.length === 0 ? (
        <EmptyState message="Aún no hay materiales para activaciones registrados." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Material</Th>
              <Th>Cantidad</Th>
              <Th>Notas</Th>
              {isAdmin ? <Th></Th> : null}
            </tr>
          </Thead>
          <tbody>
            {materials.map((m) => (
              <Tr key={m.id}>
                <Td className="font-medium">{m.name}</Td>
                <Td>{m.quantity}</Td>
                <Td className="text-slate-500">{m.notes ?? '—'}</Td>
                {isAdmin ? (
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
                        <Pencil size={12} /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setError(null); setDeleting(m); }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </Td>
                ) : null}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing ? (
        <Dialog open onClose={closeForm} title={current ? 'Editar material' : 'Nuevo material para activaciones'}>
          <form action={handleSubmit} className="space-y-4">
            <FormField label="Nombre del material">
              <Input name="name" required defaultValue={current?.name ?? ''} placeholder="Ej. Tomatodos" />
            </FormField>
            <FormField label="Cantidad disponible">
              <Input name="quantity" type="number" min={0} step={1} required defaultValue={current?.quantity ?? 0} />
            </FormField>
            <FormField label="Notas (opcional)">
              <Textarea name="notes" rows={2} defaultValue={current?.notes ?? ''} />
            </FormField>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</Button>
            </div>
          </form>
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar material"
        description={`¿Eliminar "${deleting?.name ?? ''}" de los materiales para activaciones? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        error={error}
      />
    </div>
  );
}
