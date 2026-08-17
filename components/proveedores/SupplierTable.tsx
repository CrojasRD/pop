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
import { createSupplier, updateSupplier, deleteSupplier, bulkDeleteSuppliers } from '@/actions/suppliers.actions';
import type { Supplier } from '@/lib/types';

export function SupplierTable({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = `${s.name} ${s.contact_name ?? ''} ${s.email ?? ''} ${s.category ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [suppliers, statusFilter, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));
  const selectedCount = selectedIds.size;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((s) => next.delete(s.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((s) => next.add(s.id));
      return next;
    });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    setBulkError(null);
    const result = await bulkDeleteSuppliers(Array.from(selectedIds));
    setBulkDeleting(false);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    router.refresh();
  }

  const exportRows = filtered.map((s) => ({
    Nombre: s.name,
    Contacto: s.contact_name ?? '',
    Correo: s.email ?? '',
    Teléfono: s.phone ?? '',
    Dirección: s.address ?? '',
    Categoría: s.category ?? '',
    Estado: s.status === 'active' ? 'Activo' : 'Inactivo',
    Notas: s.notes ?? ''
  }));

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = Object.fromEntries(formData.entries());
    const result = editing ? await updateSupplier(editing.id, input) : await createSupplier(input);
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
    setDeleteError(null);
    const result = await deleteSupplier(deleteTarget.id);
    setLoading(false);
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
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar por nombre, contacto, correo o categoría…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-72" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButtons rows={exportRows} fileName="proveedores" title="Proveedores - Orocash" />
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Nuevo proveedor
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} proveedor{filtered.length === 1 ? '' : 'es'}</p>

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs">
          <span className="font-medium text-slate-700">{selectedCount} seleccionado{selectedCount === 1 ? '' : 's'}</span>
          <Button size="sm" variant="danger" onClick={() => { setBulkDeleteOpen(true); setBulkError(null); }} disabled={bulkDeleting}>
            Eliminar seleccionados
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Cancelar selección</Button>
          {bulkError ? <span className="text-red-600">{bulkError}</span> : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState message="No hay proveedores registrados con esos filtros." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th className="w-8">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
              </Th>
              <Th>Nombre</Th>
              <Th>Contacto</Th>
              <Th>Correo</Th>
              <Th>Teléfono</Th>
              <Th>Categoría</Th>
              <Th>Estado</Th>
              <Th>Acciones</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} />
                </Td>
                <Td className="font-medium text-slate-800">{s.name}</Td>
                <Td>{s.contact_name ?? '—'}</Td>
                <Td>{s.email ?? '—'}</Td>
                <Td>{s.phone ?? '—'}</Td>
                <Td>{s.category ?? '—'}</Td>
                <Td><Badge status={s.status} /></Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(s); setShowForm(true); }}>Editar</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(s)}>Eliminar</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
      >
        <form action={handleSubmit} className="space-y-4">
          <FormField label="Nombre del proveedor">
            <Input name="name" required defaultValue={editing?.name ?? ''} placeholder="Razón social o nombre comercial" />
          </FormField>
          <FormField label="Persona de contacto">
            <Input name="contact_name" defaultValue={editing?.contact_name ?? ''} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Correo">
              <Input name="email" type="email" defaultValue={editing?.email ?? ''} />
            </FormField>
            <FormField label="Teléfono">
              <Input name="phone" defaultValue={editing?.phone ?? ''} />
            </FormField>
          </div>
          <FormField label="Dirección">
            <Input name="address" defaultValue={editing?.address ?? ''} />
          </FormField>
          <FormField label="Categoría">
            <Input name="category" defaultValue={editing?.category ?? ''} placeholder="Ej: Material POP, Logística, Impresión…" />
          </FormField>
          <FormField label="Estado">
            <Select name="status" defaultValue={editing?.status ?? 'active'}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </Select>
          </FormField>
          <FormField label="Notas (opcional)">
            <Textarea name="notes" rows={2} defaultValue={editing?.notes ?? ''} />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar proveedor'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Eliminar proveedor"
        description={`¿Confirmas eliminar "${deleteTarget?.name}" del registro? Esta acción no se puede deshacer.`}
        confirmLabel={loading ? 'Eliminando…' : 'Eliminar'}
        danger
        error={deleteError}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => { setBulkDeleteOpen(false); setBulkError(null); }}
        onConfirm={handleBulkDelete}
        title="Eliminar proveedores seleccionados"
        description={`¿Confirmas eliminar ${selectedCount} proveedor${selectedCount === 1 ? '' : 'es'} del registro? Esta acción no se puede deshacer.`}
        confirmLabel={bulkDeleting ? 'Eliminando…' : 'Eliminar'}
        danger
        error={bulkError}
      />
    </div>
  );
}
