'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Power, Upload } from 'lucide-react';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ExportButtons } from '@/components/shared/ExportButtons';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StoreFormDialog } from './StoreFormDialog';
import { toggleStoreStatus } from '@/actions/stores.actions';
import type { Store, Zone, AppUser } from '@/lib/types';

export function StoreTable({
  stores,
  zones,
  managers,
  isAdmin
}: {
  stores: Store[];
  zones: Zone[];
  managers: AppUser[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [editing, setEditing] = useState<Store | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<Store | null>(null);

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      const matchesQuery = !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.city.toLowerCase().includes(query.toLowerCase());
      const matchesZone = zoneFilter === 'all' || s.zone_id === zoneFilter;
      return matchesQuery && matchesZone;
    });
  }, [stores, query, zoneFilter]);

  const exportRows = filtered.map((s) => ({
    Código: s.code ?? '',
    Nombre: s.name,
    Ciudad: s.city,
    Provincia: s.province,
    Zona: s.zone?.name ?? '',
    'Jefe zonal': s.zonal_manager?.full_name ?? '',
    Correo: s.email ?? '',
    Teléfono: s.phone ?? '',
    Compañía: s.company ?? '',
    Estado: s.status
  }));

  async function confirmToggle() {
    if (!toggleTarget) return;
    await toggleStoreStatus(toggleTarget.id, toggleTarget.status === 'active' ? 'inactive' : 'active');
    setToggleTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar joyería o ciudad…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-60" />
          {isAdmin ? (
            <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-52">
              <option value="all">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </Select>
          ) : null}
        </div>
        <div className="flex gap-2">
          {isAdmin ? <ExportButtons rows={exportRows} fileName="joyerias" title="Joyerías - Orocash" /> : null}
          {isAdmin ? (
            <Link href="/joyerias/carga-masiva">
              <Button size="sm" variant="outline"><Upload size={14} /> Carga masiva</Button>
            </Link>
          ) : null}
          {isAdmin ? (
            <Button size="sm" onClick={() => setEditing(null)}>
              <Plus size={14} /> Nueva joyería
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} joyería{filtered.length === 1 ? '' : 's'}</p>

      {filtered.length === 0 ? (
        <EmptyState message="No hay joyerías registradas con esos filtros." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Código</Th>
              <Th>Joyería</Th>
              <Th>Ciudad</Th>
              <Th>Provincia</Th>
              <Th>Zona</Th>
              <Th>Jefe zonal</Th>
              <Th>Estado</Th>
              {isAdmin ? <Th>Acciones</Th> : null}
            </tr>
          </Thead>
          <tbody>
            {filtered.map((s) => (
              <Tr key={s.id}>
                <Td className="font-mono text-xs text-slate-500">{s.code ?? '—'}</Td>
                <Td>
                  <Link href={`/joyerias/${s.id}`} className="font-medium text-brand-700 hover:underline">
                    {s.name}
                  </Link>
                </Td>
                <Td>{s.city}</Td>
                <Td>{s.province}</Td>
                <Td>{s.zone?.name ?? '—'}</Td>
                <Td>{s.zonal_manager?.full_name ?? '—'}</Td>
                <Td><Badge status={s.status} /></Td>
                {isAdmin ? (
                  <Td>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setEditing(s)}><Pencil size={12} /></Button>
                      <Button size="sm" variant="outline" onClick={() => setToggleTarget(s)}><Power size={12} /></Button>
                    </div>
                  </Td>
                ) : null}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing !== undefined ? (
        <StoreFormDialog open onClose={() => setEditing(undefined)} store={editing} zones={zones} managers={managers} />
      ) : null}

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        title={toggleTarget?.status === 'active' ? 'Desactivar joyería' : 'Activar joyería'}
        description={`¿Confirmas ${toggleTarget?.status === 'active' ? 'desactivar' : 'activar'} "${toggleTarget?.name}"?`}
        confirmLabel="Confirmar"
      />
    </div>
  );
}
