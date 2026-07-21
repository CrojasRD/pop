'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Select, FormField } from '@/components/ui/Input';
import { createStore, updateStore } from '@/actions/stores.actions';
import type { Store, Zone, AppUser } from '@/lib/types';

export function StoreFormDialog({
  open,
  onClose,
  store,
  zones,
  managers
}: {
  open: boolean;
  onClose: () => void;
  store?: Store | null;
  zones: Zone[];
  managers: AppUser[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = Object.fromEntries(formData.entries());
    const result = store ? await updateStore(store.id, input) : await createStore(input);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      onClose();
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={store ? 'Editar joyería' : 'Nueva joyería'}>
      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Código de agencia">
            <Input name="code" placeholder="Ej. E-01" defaultValue={store?.code ?? ''} />
          </FormField>
          <FormField label="Compañía">
            <Input name="company" placeholder="Razón social" defaultValue={store?.company ?? ''} />
          </FormField>
        </div>
        <FormField label="Nombre de la joyería">
          <Input name="name" required defaultValue={store?.name} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ciudad">
            <Input name="city" required defaultValue={store?.city} />
          </FormField>
          <FormField label="Provincia">
            <Input name="province" required defaultValue={store?.province} />
          </FormField>
        </div>
        <FormField label="Dirección">
          <Input name="address" defaultValue={store?.address ?? ''} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Correo de la agencia">
            <Input name="email" type="email" placeholder="joyeria-e01@orocash.ec" defaultValue={store?.email ?? ''} />
          </FormField>
          <FormField label="Celular">
            <Input name="phone" placeholder="099-999-9999" defaultValue={store?.phone ?? ''} />
          </FormField>
        </div>
        <FormField label="Zona">
          <Select name="zone_id" required defaultValue={store?.zone_id ?? ''}>
            <option value="" disabled>Selecciona una zona</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Jefe zonal responsable (opcional)">
          <Select name="zonal_manager_id" defaultValue={store?.zonal_manager_id ?? ''}>
            <option value="">Sin asignar</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Estado">
          <Select name="status" defaultValue={store?.status ?? 'active'}>
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
          </Select>
        </FormField>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
