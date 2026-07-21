'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil } from 'lucide-react';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { createZone, updateZone } from '@/actions/zones.actions';
import type { AppUser, Store, Zone } from '@/lib/types';

export function ZoneManager({ zones, managers, stores }: { zones: Zone[]; managers: AppUser[]; stores: Store[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Zone | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = Object.fromEntries(formData.entries());
    const result = editing ? await updateZone(editing.id, input) : await createZone(input);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setEditing(undefined);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Zonas y jefes zonales</h2>
        <Button size="sm" onClick={() => setEditing(null)}><Plus size={14} /> Nueva zona</Button>
      </div>

      {zones.length === 0 ? (
        <EmptyState message="No hay zonas registradas." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Zona</Th>
              <Th>Jefe zonal</Th>
              <Th>Joyerías asignadas</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {zones.map((z) => {
              const manager = managers.find((m) => m.id === z.manager_id);
              const zoneStores = stores.filter((s) => s.zone_id === z.id);
              return (
                <Tr key={z.id}>
                  <Td className="font-medium text-slate-800">{z.name}</Td>
                  <Td>{manager?.full_name ?? '—'}</Td>
                  <Td className="text-xs text-slate-500">{zoneStores.map((s) => s.name).join(', ') || '—'}</Td>
                  <Td><Button size="sm" variant="outline" onClick={() => setEditing(z)}><Pencil size={12} /></Button></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {editing !== undefined ? (
        <Dialog open onClose={() => setEditing(undefined)} title={editing ? 'Editar zona' : 'Nueva zona'}>
          <form action={handleSubmit} className="space-y-4">
            <FormField label="Nombre de la zona">
              <Input name="name" required defaultValue={editing?.name} />
            </FormField>
            <FormField label="Descripción">
              <Textarea name="description" rows={2} defaultValue={editing?.description ?? ''} />
            </FormField>
            <FormField label="Jefe zonal responsable">
              <Select name="manager_id" defaultValue={editing?.manager_id ?? ''}>
                <option value="">Sin asignar</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </Select>
            </FormField>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(undefined)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}
