'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Power } from 'lucide-react';
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, FormField } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDateTime } from '@/lib/utils';
import { createUser, updateUser, setUserStatus } from '@/actions/users.actions';
import type { AppUser, Zone } from '@/lib/types';

export function UserTable({ users, zones }: { users: AppUser[]; zones: Zone[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AppUser | null | undefined>(undefined);
  const [toggleTarget, setToggleTarget] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => users.filter((u) => !query || u.full_name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())),
    [users, query]
  );

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = Object.fromEntries(formData.entries());
    const result = editing ? await updateUser(editing.id, input) : await createUser(input);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setEditing(undefined);
      router.refresh();
    }
  }

  async function confirmToggle() {
    if (!toggleTarget) return;
    await setUserStatus(toggleTarget.id, toggleTarget.status === 'active' ? 'inactive' : 'active');
    setToggleTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input placeholder="Buscar por nombre o correo…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
        <Button onClick={() => setEditing(null)}><Plus size={14} /> Nuevo usuario</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No hay usuarios registrados." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Correo</Th>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>Zona</Th>
              <Th>Estado</Th>
              <Th>Último acceso</Th>
              <Th>Acciones</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((u) => (
              <Tr key={u.id}>
                <Td className="font-medium text-slate-800">{u.full_name}</Td>
                <Td>{u.email}</Td>
                <Td>{u.username}</Td>
                <Td><Badge status={u.role} /></Td>
                <Td>{u.zone?.name ?? '—'}</Td>
                <Td><Badge status={u.status} /></Td>
                <Td className="text-xs text-slate-400">{formatDateTime(u.last_login)}</Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditing(u)}><Pencil size={12} /></Button>
                    <Button size="sm" variant="outline" onClick={() => setToggleTarget(u)}><Power size={12} /></Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing !== undefined ? (
        <Dialog open onClose={() => setEditing(undefined)} title={editing ? 'Editar usuario' : 'Nuevo usuario'}>
          <form action={handleSubmit} className="space-y-4">
            <FormField label="Nombre completo">
              <Input name="full_name" required defaultValue={editing?.full_name} />
            </FormField>
            <FormField label="Correo">
              <Input name="email" type="email" required defaultValue={editing?.email} disabled={!!editing} />
            </FormField>
            <FormField label="Usuario">
              <Input name="username" required defaultValue={editing?.username} />
            </FormField>
            <FormField label="Rol">
              <Select name="role" required defaultValue={editing?.role ?? 'zonal_manager'}>
                <option value="admin">Administrador</option>
                <option value="zonal_manager">Jefe Zonal</option>
              </Select>
            </FormField>
            <FormField label="Zona asignada">
              <Select name="zone_id" defaultValue={editing?.zone_id ?? ''}>
                <option value="">Sin asignar</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </Select>
            </FormField>
            <FormField label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}>
              <Input name="password" type="password" required={!editing} minLength={8} placeholder="Mínimo 8 caracteres" />
            </FormField>
            <FormField label="Estado">
              <Select name="status" defaultValue={editing?.status ?? 'active'}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
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

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        title={toggleTarget?.status === 'active' ? 'Desactivar usuario' : 'Activar usuario'}
        description={`¿Confirmas ${toggleTarget?.status === 'active' ? 'desactivar' : 'activar'} a "${toggleTarget?.full_name}"?`}
      />
    </div>
  );
}
