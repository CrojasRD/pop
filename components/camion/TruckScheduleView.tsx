'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { TruckCalendar, computeTruckDisplayStatus } from './TruckCalendar';
import { formatDate } from '@/lib/utils';
import { createTruckStop, updateTruckStop, cancelTruckStop, deleteTruckStop, bulkDeleteTruckStops } from '@/actions/truck.actions';
import type { AppUser, TruckStop, Zone } from '@/lib/types';

export function TruckScheduleView({
  stops,
  zones,
  user
}: {
  stops: TruckStop[];
  zones: Zone[];
  user: AppUser;
}) {
  const router = useRouter();
  const isAdmin = user.role === 'admin';
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TruckStop | null>(null);
  const [selected, setSelected] = useState<TruckStop | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TruckStop | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TruckStop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filtered = useMemo(
    () => stops.filter((s) => zoneFilter === 'all' || s.zone_id === zoneFilter),
    [stops, zoneFilter]
  );

  const exportRows = filtered.map((s) => ({
    Zona: s.zone?.name ?? '',
    Actividad: s.activity_name,
    Inicio: s.start_date,
    Fin: s.end_date,
    Estado: computeTruckDisplayStatus(s),
    Notas: s.notes ?? ''
  }));

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = Object.fromEntries(formData.entries());
    const result = editing ? await updateTruckStop(editing.id, input) : await createTruckStop(input);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setShowCreate(false);
      setEditing(null);
      router.refresh();
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setLoading(true);
    await cancelTruckStop(cancelTarget.id);
    setLoading(false);
    setCancelTarget(null);
    setSelected(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    await deleteTruckStop(deleteTarget.id);
    setLoading(false);
    setDeleteTarget(null);
    setSelected(null);
    router.refresh();
  }

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
    const result = await bulkDeleteTruckStops(Array.from(selectedIds));
    setBulkDeleting(false);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === 'calendar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            <CalendarDays size={14} /> Calendario
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            <List size={14} /> Cronograma
          </button>
        </div>
        <div className="flex gap-2">
          {isAdmin ? <ExportButtons rows={exportRows} fileName="cronograma-camion" title="Cronograma del Camión - Orocash" /> : null}
          {isAdmin ? (
            <Button onClick={() => { setEditing(null); setShowCreate(true); }}>
              <Plus size={14} /> Nueva actividad
            </Button>
          ) : null}
        </div>
      </div>

      {isAdmin ? (
        <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-52">
          <option value="all">Todas las zonas</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </Select>
      ) : null}

      {view === 'list' && isAdmin && selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs">
          <span className="font-medium text-slate-700">{selectedCount} seleccionada{selectedCount === 1 ? '' : 's'}</span>
          <Button size="sm" variant="danger" onClick={() => { setBulkDeleteOpen(true); setBulkError(null); }} disabled={bulkDeleting}>
            Eliminar seleccionadas
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Cancelar selección</Button>
          {bulkError ? <span className="text-red-600">{bulkError}</span> : null}
        </div>
      ) : null}

      {view === 'calendar' ? (
        <TruckCalendar stops={filtered} onSelect={setSelected} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No hay actividades programadas para el camión." />
      ) : (
        <Table>
          <Thead>
            <tr>
              {isAdmin ? (
                <Th className="w-8">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} onClick={(ev) => ev.stopPropagation()} />
                </Th>
              ) : null}
              <Th>Zona</Th>
              <Th>Actividad</Th>
              <Th>Fechas</Th>
              <Th>Estado</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((s) => (
              <Tr key={s.id} className="cursor-pointer" onClick={() => setSelected(s)}>
                {isAdmin ? (
                  <Td onClick={(ev) => ev.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} />
                  </Td>
                ) : null}
                <Td>{s.zone?.name ?? '—'}</Td>
                <Td className="font-medium text-brand-700">{s.activity_name}</Td>
                <Td>{formatDate(s.start_date)} – {formatDate(s.end_date)}</Td>
                <Td><Badge status={computeTruckDisplayStatus(s)} /></Td>
                <Td></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Dialog
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        title={editing ? 'Editar actividad del camión' : 'Nueva actividad del camión'}
      >
        <form action={handleCreate} className="space-y-4">
          <FormField label="Zona">
            <Select name="zone_id" required defaultValue={editing?.zone_id ?? ''}>
              <option value="" disabled>Selecciona una zona</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Actividad">
            <Input name="activity_name" required defaultValue={editing?.activity_name ?? ''} placeholder="Ej: Feria de joyas, mantenimiento de fachadas…" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Desde">
              <Input name="start_date" type="date" required defaultValue={editing?.start_date ?? ''} />
            </FormField>
            <FormField label="Hasta">
              <Input name="end_date" type="date" required defaultValue={editing?.end_date ?? ''} />
            </FormField>
          </div>
          <FormField label="Notas (opcional)">
            <Textarea name="notes" rows={2} defaultValue={editing?.notes ?? ''} />
          </FormField>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setEditing(null); }}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Programar actividad'}</Button>
          </div>
        </form>
      </Dialog>

      {selected ? (
        <Dialog open onClose={() => setSelected(null)} title="Detalle de la actividad">
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-slate-400">Zona</dt><dd>{selected.zone?.name ?? '—'}</dd></div>
              <div><dt className="text-slate-400">Estado</dt><dd><Badge status={computeTruckDisplayStatus(selected)} /></dd></div>
              <div><dt className="text-slate-400">Desde</dt><dd>{formatDate(selected.start_date)}</dd></div>
              <div><dt className="text-slate-400">Hasta</dt><dd>{formatDate(selected.end_date)}</dd></div>
            </dl>
            <p className="text-slate-700 font-medium">{selected.activity_name}</p>
            {selected.notes ? <p className="text-slate-600">{selected.notes}</p> : null}

            {isAdmin ? (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setShowCreate(true); setSelected(null); }}>Editar</Button>
                {selected.status !== 'cancelled' ? (
                  <Button size="sm" variant="outline" onClick={() => setCancelTarget(selected)}>Cancelar actividad</Button>
                ) : null}
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget(selected)}>Eliminar</Button>
              </div>
            ) : null}
          </div>
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancelar actividad"
        description={`¿Confirmas cancelar "${cancelTarget?.activity_name}"? Seguirá visible en el historial marcada como cancelada.`}
        confirmLabel="Cancelar actividad"
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar actividad"
        description={`¿Confirmas eliminar "${deleteTarget?.activity_name}" del cronograma? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => { setBulkDeleteOpen(false); setBulkError(null); }}
        onConfirm={handleBulkDelete}
        title="Eliminar actividades seleccionadas"
        description={`¿Confirmas eliminar ${selectedCount} actividad${selectedCount === 1 ? '' : 'es'} del cronograma? Esta acción no se puede deshacer.`}
        confirmLabel={bulkDeleting ? 'Eliminando…' : 'Eliminar'}
        danger
        error={bulkError}
      />
    </div>
  );
}
