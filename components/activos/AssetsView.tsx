'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { ASSET_TYPES } from '@/lib/constants';
import { createAsset, updateAsset, deleteAsset } from '@/actions/assets.actions';
import { canEditAsset, canDeleteAsset } from '@/lib/permissions';
import type { Asset, AppUser, Store, Zone } from '@/lib/types';

export function AssetsView({
  assets,
  zones,
  stores,
  user
}: {
  assets: Asset[];
  zones: Zone[];
  stores: Store[];
  user: AppUser;
}) {
  const router = useRouter();
  const isAdmin = user.role === 'admin';
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeOptions = useMemo(() => {
    const set = new Set<string>(ASSET_TYPES);
    assets.forEach((a) => set.add(a.asset_type));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (zoneFilter !== 'all' && a.zone_id !== zoneFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (typeFilter !== 'all' && a.asset_type !== typeFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = `${a.asset_type} ${a.location ?? ''} ${a.responsible_name ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [assets, zoneFilter, statusFilter, typeFilter, query]);

  const exportRows = filtered.map((a) => ({
    Tipo: a.asset_type,
    Zona: a.zone?.name ?? '',
    Ubicación: a.location ?? '',
    Responsable: a.responsible_name ?? '',
    Estado: a.status,
    Notas: a.notes ?? ''
  }));

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = Object.fromEntries(formData.entries());
    const result = editing ? await updateAsset(editing.id, input) : await createAsset(input);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setShowForm(false);
      setEditing(null);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    await deleteAsset(deleteTarget.id);
    setLoading(false);
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar por tipo, ubicación o responsable…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
          {isAdmin ? (
            <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-48">
              <option value="all">Todas las zonas</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </Select>
          ) : null}
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-52">
            <option value="all">Todos los tipos</option>
            {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
            <option value="all">Todos los estados</option>
            <option value="good">Buen estado</option>
            <option value="damaged">Dañado</option>
            <option value="maintenance">En mantenimiento</option>
          </Select>
        </div>
        <div className="flex gap-2">
          {isAdmin ? <ExportButtons rows={exportRows} fileName="activos" title="Activos - Orocash" /> : null}
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Nuevo activo
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} activo{filtered.length === 1 ? '' : 's'}</p>

      {filtered.length === 0 ? (
        <EmptyState message="No hay activos registrados con esos filtros." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Tipo</Th>
              <Th>Zona</Th>
              <Th>Ubicación</Th>
              <Th>Responsable</Th>
              <Th>Estado</Th>
              <Th>Acciones</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((a) => {
              const canEdit = canEditAsset(user, a.zone_id);
              return (
                <Tr key={a.id}>
                  <Td className="font-medium text-slate-800">{a.asset_type}</Td>
                  <Td>{a.zone?.name ?? '—'}</Td>
                  <Td>{a.location ?? '—'}</Td>
                  <Td>{a.responsible_name ?? '—'}</Td>
                  <Td><Badge status={a.status} /></Td>
                  <Td>
                    <div className="flex gap-1.5">
                      {canEdit ? (
                        <Button size="sm" variant="outline" onClick={() => { setEditing(a); setShowForm(true); }}>Editar</Button>
                      ) : null}
                      {canDeleteAsset(user) ? (
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(a)}>Eliminar</Button>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <Dialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? 'Editar activo' : 'Nuevo activo'}
      >
        <form action={handleSubmit} className="space-y-4">
          <FormField label="Tipo de activo">
            <Input name="asset_type" list="asset-type-options" required defaultValue={editing?.asset_type ?? ''} placeholder="Ej: Inflable, Banner Human…" />
            <datalist id="asset-type-options">
              {ASSET_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </FormField>
          <FormField label="Zona">
            {user.role === 'zonal_manager' ? (
              <>
                {/* Los <select> deshabilitados no se incluyen en el FormData al enviar,
                    así que se muestra sin `name` (solo visual) y se envía el valor real
                    mediante un input oculto. */}
                <Select defaultValue={user.zone_id ?? ''} disabled>
                  <option value={user.zone_id ?? ''}>{zones.find((z) => z.id === user.zone_id)?.name ?? '—'}</option>
                </Select>
                <input type="hidden" name="zone_id" value={user.zone_id ?? ''} />
              </>
            ) : (
              <Select name="zone_id" required defaultValue={editing?.zone_id ?? ''}>
                <option value="" disabled>Selecciona una zona</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </Select>
            )}
          </FormField>
          <FormField label="Joyería relacionada (opcional)">
            <Select name="store_id" defaultValue={editing?.store_id ?? ''}>
              <option value="">Sin joyería específica</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Ubicación">
            <Input name="location" defaultValue={editing?.location ?? ''} placeholder="Ej: Bodega zonal, agencia Guayaquil…" />
          </FormField>
          <FormField label="Responsable">
            <Input name="responsible_name" defaultValue={editing?.responsible_name ?? ''} placeholder="Nombre de quien está a cargo" />
          </FormField>
          <FormField label="Estado">
            <Select name="status" defaultValue={editing?.status ?? 'good'}>
              <option value="good">Buen estado</option>
              <option value="damaged">Dañado</option>
              <option value="maintenance">En mantenimiento</option>
            </Select>
          </FormField>
          <FormField label="Notas (opcional)">
            <Textarea name="notes" rows={2} defaultValue={editing?.notes ?? ''} />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar activo'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar activo"
        description={`¿Confirmas eliminar "${deleteTarget?.asset_type}" del registro? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}
