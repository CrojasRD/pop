'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet, Calendar, TrendingUp, Layers } from 'lucide-react';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { createExpense, updateExpense, deleteExpense, bulkDeleteExpenses } from '@/actions/expenses.actions';
import { formatDate, formatCurrency, statusLabel } from '@/lib/utils';
import type { Expense, Supplier, Zone } from '@/lib/types';

const CATEGORIES = ['material_pop', 'logistica', 'camion', 'mantenimiento', 'personal', 'proveedores', 'otros'] as const;

export function ExpensesView({
  expenses,
  suppliers,
  zones
}: {
  expenses: Expense[];
  suppliers: Supplier[];
  zones: Zone[];
}) {
  const router = useRouter();
  const years = useMemo(() => {
    const set = new Set(expenses.map((e) => e.expense_date.slice(0, 4)));
    set.add(String(new Date().getFullYear()));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const yearExpenses = useMemo(
    () => (yearFilter === 'all' ? expenses : expenses.filter((e) => e.expense_date.startsWith(yearFilter))),
    [expenses, yearFilter]
  );

  const filtered = useMemo(() => {
    return yearExpenses.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = `${e.description} ${e.supplier?.name ?? ''} ${e.zone?.name ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [yearExpenses, categoryFilter, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
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
        filtered.forEach((e) => next.delete(e.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((e) => next.add(e.id));
      return next;
    });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    setBulkError(null);
    const result = await bulkDeleteExpenses(Array.from(selectedIds));
    setBulkDeleting(false);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    router.refresh();
  }

  const totalYear = yearExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalFiltered = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of yearExpenses) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [yearExpenses]);

  const topCategory = byCategory[0];

  const exportRows = filtered.map((e) => ({
    Fecha: formatDate(e.expense_date),
    Categoría: statusLabel(e.category),
    Descripción: e.description,
    Monto: Number(e.amount),
    Proveedor: e.supplier?.name ?? '',
    Zona: e.zone?.name ?? '',
    Notas: e.notes ?? ''
  }));

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = Object.fromEntries(formData.entries());
    const result = editing ? await updateExpense(editing.id, input) : await createExpense(input);
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
    const result = await deleteExpense(deleteTarget.id);
    setLoading(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label={`Total ${yearFilter === 'all' ? '(todos los años)' : yearFilter}`}
          value={formatCurrency(totalYear)}
          icon={Wallet}
        />
        <MetricCard label="Registros" value={yearExpenses.length} icon={Layers} />
        <MetricCard
          label="Categoría principal"
          value={topCategory ? statusLabel(topCategory[0]) : '—'}
          icon={TrendingUp}
          hint={topCategory ? formatCurrency(topCategory[1]) : undefined}
        />
        <MetricCard label="Resultado filtrado" value={formatCurrency(totalFiltered)} icon={Calendar} hint={`${filtered.length} gasto${filtered.length === 1 ? '' : 's'}`} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar por descripción, proveedor o zona…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-72" />
          <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-32">
            <option value="all">Todos los años</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48">
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{statusLabel(c)}</option>)}
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButtons rows={exportRows} fileName="gastos" title="Gastos - Orocash" />
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Nuevo gasto
          </Button>
        </div>
      </div>

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
        <EmptyState message="No hay gastos registrados con esos filtros." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th className="w-8">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
              </Th>
              <Th>Fecha</Th>
              <Th>Categoría</Th>
              <Th>Descripción</Th>
              <Th>Proveedor</Th>
              <Th>Zona</Th>
              <Th>Monto</Th>
              <Th>Acciones</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered
              .slice()
              .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
              .map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} />
                  </Td>
                  <Td>{formatDate(e.expense_date)}</Td>
                  <Td><Badge status={e.category} /></Td>
                  <Td className="max-w-xs truncate font-medium text-slate-800">{e.description}</Td>
                  <Td>{e.supplier?.name ?? '—'}</Td>
                  <Td>{e.zone?.name ?? '—'}</Td>
                  <Td className="font-medium text-slate-800">{formatCurrency(e.amount)}</Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(e); setShowForm(true); }}>Editar</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(e)}>Eliminar</Button>
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
        title={editing ? 'Editar gasto' : 'Nuevo gasto'}
      >
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Fecha">
              <Input name="expense_date" type="date" required defaultValue={editing?.expense_date ?? new Date().toISOString().slice(0, 10)} />
            </FormField>
            <FormField label="Categoría">
              <Select name="category" defaultValue={editing?.category ?? 'otros'}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{statusLabel(c)}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Descripción">
            <Input name="description" required defaultValue={editing?.description ?? ''} placeholder="Ej: Compra de banners para campaña Q3" />
          </FormField>
          <FormField label="Monto (USD)">
            <Input name="amount" type="number" step="0.01" min="0" required defaultValue={editing?.amount ?? ''} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Proveedor (opcional)">
              <Select name="supplier_id" defaultValue={editing?.supplier_id ?? ''}>
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Zona (opcional)">
              <Select name="zone_id" defaultValue={editing?.zone_id ?? ''}>
                <option value="">Gasto general</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Notas (opcional)">
            <Textarea name="notes" rows={2} defaultValue={editing?.notes ?? ''} />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar gasto'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Eliminar gasto"
        description={`¿Confirmas eliminar el gasto "${deleteTarget?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel={loading ? 'Eliminando…' : 'Eliminar'}
        danger
        error={deleteError}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => { setBulkDeleteOpen(false); setBulkError(null); }}
        onConfirm={handleBulkDelete}
        title="Eliminar gastos seleccionados"
        description={`¿Confirmas eliminar ${selectedCount} gasto${selectedCount === 1 ? '' : 's'}? Esta acción no se puede deshacer.`}
        confirmLabel={bulkDeleting ? 'Eliminando…' : 'Eliminar'}
        danger
        error={bulkError}
      />
    </div>
  );
}
