'use client';

import { useMemo, useState } from 'react';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Select, Input } from '@/components/ui/Input';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog } from '@/lib/types';

const MODULES = ['pop_items', 'stores', 'events', 'replenishment_requests', 'acquisition_requests', 'users', 'zones', 'auth', 'inventory'];

export function HistorialTable({ logs }: { logs: AuditLog[] }) {
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (moduleFilter !== 'all' && l.module !== moduleFilter) return false;
      if (actionFilter !== 'all' && l.action_type !== actionFilter) return false;
      if (query && !(l.user?.full_name ?? '').toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [logs, moduleFilter, actionFilter, query]);

  const exportRows = filtered.map((l) => ({
    Usuario: l.user?.full_name ?? '—',
    Acción: l.action_type,
    Módulo: l.module,
    Fecha: formatDateTime(l.created_at)
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar por usuario…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
          <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="w-48">
            <option value="all">Todos los módulos</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-48">
            <option value="all">Todas las acciones</option>
            <option value="create">Creación</option>
            <option value="update">Edición</option>
            <option value="delete">Eliminación</option>
            <option value="approve">Aprobación</option>
            <option value="reject">Rechazo</option>
            <option value="deliver">Entrega</option>
            <option value="bulk_upload">Carga masiva</option>
            <option value="login">Inicio de sesión</option>
          </Select>
        </div>
        <ExportButtons rows={exportRows} fileName="historial-movimientos" title="Historial de movimientos" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No hay registros de auditoría con esos filtros." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Acción</Th>
              <Th>Módulo</Th>
              <Th>Registro</Th>
              <Th>Fecha</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.slice(0, 200).map((l) => (
              <Tr key={l.id}>
                <Td>{l.user?.full_name ?? '—'}</Td>
                <Td><Badge status={l.action_type} /></Td>
                <Td className="font-mono text-xs">{l.module}</Td>
                <Td className="font-mono text-xs text-slate-400">{l.record_id?.slice(0, 8) ?? '—'}</Td>
                <Td className="text-xs text-slate-400">{formatDateTime(l.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
