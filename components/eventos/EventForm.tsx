'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createEvent, updateEvent } from '@/actions/events.actions';
import type { AppUser, EventRecord, PopItem, Store, Zone } from '@/lib/types';

export function EventForm({
  user,
  zones,
  stores,
  popItems,
  event
}: {
  user: AppUser;
  zones: Zone[];
  stores: Store[];
  popItems: PopItem[];
  event?: EventRecord;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<{ pop_item_id: string; quantity: number }[]>(
    event?.required_pop_materials ?? []
  );
  const [zoneId, setZoneId] = useState(event?.zone_id ?? (user.role === 'zonal_manager' ? user.zone_id ?? '' : ''));

  const storesInZone = stores.filter((s) => !zoneId || s.zone_id === zoneId);

  function addMaterial() {
    if (popItems.length === 0) return;
    setMaterials((m) => [...m, { pop_item_id: popItems[0].id, quantity: 1 }]);
  }

  function updateMaterial(idx: number, field: 'pop_item_id' | 'quantity', value: string) {
    setMaterials((m) => m.map((row, i) => (i === idx ? { ...row, [field]: field === 'quantity' ? Number(value) : value } : row)));
  }

  function removeMaterial(idx: number) {
    setMaterials((m) => m.filter((_, i) => i !== idx));
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const input = {
      event_name: formData.get('event_name'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      start_time: formData.get('start_time'),
      end_time: formData.get('end_time'),
      city: formData.get('city'),
      province: formData.get('province'),
      location: formData.get('location'),
      store_id: formData.get('store_id'),
      zone_id: formData.get('zone_id'),
      event_type: formData.get('event_type'),
      description: formData.get('description'),
      justification: formData.get('justification'),
      required_pop_materials: materials
    };

    const result = event ? await updateEvent(event.id, input) : await createEvent(input);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push('/eventos');
  }

  return (
    <form action={handleSubmit} className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField label="Nombre del evento">
          <Input name="event_name" required defaultValue={event?.event_name} />
        </FormField>
      </div>

      <FormField label="Fecha de inicio">
        <Input name="start_date" type="date" required defaultValue={event?.start_date} />
      </FormField>
      <FormField label="Fecha de fin">
        <Input name="end_date" type="date" required defaultValue={event?.end_date} />
      </FormField>
      <FormField label="Hora de inicio">
        <Input name="start_time" type="time" defaultValue={event?.start_time ?? ''} />
      </FormField>
      <FormField label="Hora de fin">
        <Input name="end_time" type="time" defaultValue={event?.end_time ?? ''} />
      </FormField>

      <FormField label="Zona">
        {user.role === 'zonal_manager' ? (
          <>
            {/* Un <select> deshabilitado no se incluye en el FormData al enviar,
                así que se muestra solo como referencia visual y el valor real
                viaja en un input oculto. */}
            <Select defaultValue={zoneId ?? ''} disabled>
              <option value={zoneId ?? ''}>{zones.find((z) => z.id === zoneId)?.name ?? '—'}</option>
            </Select>
            <input type="hidden" name="zone_id" value={zoneId ?? ''} />
          </>
        ) : (
          <Select
            name="zone_id"
            required
            defaultValue={zoneId ?? ''}
            onChange={(e) => setZoneId(e.target.value)}
          >
            <option value="" disabled>Selecciona una zona</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField label="Joyería relacionada">
        <Select name="store_id" defaultValue={event?.store_id ?? ''}>
          <option value="">Sin joyería específica</option>
          {storesInZone.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </FormField>

      <FormField label="Ciudad">
        <Input name="city" defaultValue={event?.city ?? ''} />
      </FormField>
      <FormField label="Provincia">
        <Input name="province" defaultValue={event?.province ?? ''} />
      </FormField>

      <div className="sm:col-span-2">
        <FormField label="Lugar del evento">
          <Input name="location" defaultValue={event?.location ?? ''} />
        </FormField>
      </div>
      <FormField label="Tipo de evento">
        <Input name="event_type" placeholder="Activación, feria, lanzamiento…" defaultValue={event?.event_type ?? ''} />
      </FormField>

      <div className="sm:col-span-2">
        <FormField label="Descripción">
          <Textarea name="description" rows={2} defaultValue={event?.description ?? ''} />
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormField label="Justificación de participación">
          <Textarea name="justification" rows={2} defaultValue={event?.justification ?? ''} />
        </FormField>
      </div>

      <div className="sm:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-600">Material POP requerido</p>
          <Button type="button" size="sm" variant="outline" onClick={addMaterial}>
            <Plus size={12} /> Agregar material
          </Button>
        </div>
        {materials.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Select value={row.pop_item_id} onChange={(e) => updateMaterial(idx, 'pop_item_id', e.target.value)} className="flex-1">
              {popItems.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Input
              type="number"
              min={1}
              value={row.quantity}
              onChange={(e) => updateMaterial(idx, 'quantity', e.target.value)}
              className="w-24"
            />
            <button type="button" onClick={() => removeMaterial(idx)} className="text-slate-400 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {materials.length === 0 ? <p className="text-xs text-slate-400">No se ha agregado material POP requerido.</p> : null}
      </div>

      {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}

      <div className="sm:col-span-2 flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : event ? 'Guardar cambios' : 'Crear evento'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
