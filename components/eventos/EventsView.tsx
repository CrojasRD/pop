'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, List, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EventCalendar } from './EventCalendar';
import { EventDetailDialog } from './EventDetailDialog';
import { formatDate } from '@/lib/utils';
import { deleteEvent, bulkDeleteEvents, bulkApproveEvents } from '@/actions/events.actions';
import { canDeleteEvent } from '@/lib/permissions';
import type { AppUser, EventRecord, Store, Zone } from '@/lib/types';

export function EventsView({
  events,
  zones,
  stores,
  popItemNames = {},
  user
}: {
  events: EventRecord[];
  zones: Zone[];
  stores: Store[];
  popItemNames?: Record<string, string>;
  user: AppUser;
}) {
  const router = useRouter();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selected, setSelected] = useState<EventRecord | null>(null);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (zoneFilter !== 'all' && e.zone_id !== zoneFilter) return false;
      if (storeFilter !== 'all' && e.store_id !== storeFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (cityFilter && !(e.city ?? '').toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (dateFrom && e.end_date < dateFrom) return false;
      if (dateTo && e.start_date > dateTo) return false;
      return true;
    });
  }, [events, zoneFilter, storeFilter, statusFilter, cityFilter, dateFrom, dateTo]);

  const exportRows = filtered.map((e) => ({
    Evento: e.event_name,
    Inicio: e.start_date,
    Fin: e.end_date,
    Zona: e.zone?.name ?? '',
    Joyería: e.store?.name ?? '',
    Ciudad: e.city ?? '',
    Estado: e.status
  }));

  async function handleDeleteEvent() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteEvent(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
  const selectedCount = selectedIds.size;
  const selectedPendingCount = filtered.filter((e) => selectedIds.has(e.id) && e.status === 'pending').length;

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
    const result = await bulkDeleteEvents(Array.from(selectedIds));
    setBulkDeleting(false);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    router.refresh();
  }

  async function handleBulkApprove() {
    setBulkApproving(true);
    setBulkError(null);
    const result = await bulkApproveEvents(Array.from(selectedIds));
    setBulkApproving(false);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
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
            <List size={14} /> Lista
          </button>
        </div>
        <div className="flex gap-2">
          {user.role === 'admin' ? <ExportButtons rows={exportRows} fileName="eventos" title="Eventos - Orocash" /> : null}
          {user.role === 'admin' ? (
            <Link href="/eventos/carga-masiva">
              <Button variant="outline"><Upload size={14} /> Carga masiva</Button>
            </Link>
          ) : null}
          <Link href="/eventos/nuevo">
            <Button><Plus size={14} /> Nuevo evento</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {user.role === 'admin' ? (
          <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-44">
            <option value="all">Todas las zonas</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </Select>
        ) : null}
        <Select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="w-44">
          <option value="all">Todas las joyerías</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
          <option value="cancelled">Cancelado</option>
          <option value="finished">Finalizado</option>
        </Select>
        <Input placeholder="Ciudad…" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-36" />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
      </div>

      {view === 'list' && canDeleteEvent(user) && selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs">
          <span className="font-medium text-slate-700">{selectedCount} seleccionado{selectedCount === 1 ? '' : 's'}</span>
          {selectedPendingCount > 0 ? (
            <Button size="sm" onClick={handleBulkApprove} disabled={bulkApproving}>
              {bulkApproving ? 'Aprobando…' : `Aprobar pendientes (${selectedPendingCount})`}
            </Button>
          ) : null}
          <Button size="sm" variant="danger" onClick={() => { setBulkDeleteOpen(true); setBulkError(null); }} disabled={bulkDeleting}>
            Eliminar seleccionados
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Cancelar selección</Button>
          {bulkError ? <span className="text-red-600">{bulkError}</span> : null}
        </div>
      ) : null}

      {view === 'calendar' ? (
        <EventCalendar events={filtered} onSelect={setSelected} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No hay eventos con esos filtros." />
      ) : (
        <Table>
          <Thead>
            <tr>
              {canDeleteEvent(user) ? (
                <Th className="w-8">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} onClick={(ev) => ev.stopPropagation()} />
                </Th>
              ) : null}
              <Th>Evento</Th>
              <Th>Fechas</Th>
              <Th>Zona</Th>
              <Th>Joyería</Th>
              <Th>Ciudad</Th>
              <Th>Estado</Th>
              {canDeleteEvent(user) ? <Th></Th> : null}
            </tr>
          </Thead>
          <tbody>
            {filtered.map((e) => (
              <Tr key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                {canDeleteEvent(user) ? (
                  <Td onClick={(ev) => ev.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} />
                  </Td>
                ) : null}
                <Td className="font-medium text-brand-700">{e.event_name}</Td>
                <Td>{formatDate(e.start_date)} – {formatDate(e.end_date)}</Td>
                <Td>{e.zone?.name ?? '—'}</Td>
                <Td>{e.store?.name ?? '—'}</Td>
                <Td>{e.city ?? '—'}</Td>
                <Td><Badge status={e.status} /></Td>
                {canDeleteEvent(user) ? (
                  <Td onClick={(ev) => ev.stopPropagation()}>
                    <Button size="sm" variant="danger" onClick={() => { setDeleteTarget(e); setDeleteError(null); }}>Eliminar</Button>
                  </Td>
                ) : null}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {selected ? (
        <EventDetailDialog event={selected} user={user} popItemNames={popItemNames} onClose={() => setSelected(null)} />
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDeleteEvent}
        title="Eliminar evento"
        description={`¿Confirmas eliminar "${deleteTarget?.event_name}" definitivamente? Esta acción no se puede deshacer.`}
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
        error={deleteError}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => { setBulkDeleteOpen(false); setBulkError(null); }}
        onConfirm={handleBulkDelete}
        title="Eliminar eventos seleccionados"
        description={`¿Confirmas eliminar ${selectedCount} evento${selectedCount === 1 ? '' : 's'} definitivamente? Esta acción no se puede deshacer.`}
        confirmLabel={bulkDeleting ? 'Eliminando…' : 'Eliminar'}
        danger
        error={bulkError}
      />
    </div>
  );
}
