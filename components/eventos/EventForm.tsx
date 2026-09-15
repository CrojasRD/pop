'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createEvent, updateEvent } from '@/actions/events.actions';
import type { AppUser, EventRecord, Store, Zone } from '@/lib/types';

const MATERIAL_PRESETS = ['Banderines', 'Camión', 'Carpa', 'Mesa', 'Anillos', 'Inflable'];
const MATERIAL_OPTIONS = [...MATERIAL_PRESETS, 'Otro'];

export function EventForm({
  user,
  zones,
  stores,
  event
}: {
  user: AppUser;
  zones: Zone[];
  stores: Store[];
  event?: EventRecord;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<{ material_name: string; quantity: number }[]>(
    event?.required_pop_materials?.map((m) => ({ material_name: m.material_name, quantity: m.quantity })) ?? []
  );
  const [zoneId, setZoneId] = useState(event?.zone_id ?? (user.role === 'zonal_manager' ? user.zone_id ?? '' : ''));

  const storesInZone = stores.filter((s) => !zoneId || s.zone_id === zoneId);

  function addMaterial() {
    setMaterials((m) => [...m, { material_name: MATERIAL_PRESETS[0], quantity: 1 }]);
  }

  function updateMaterialOption(idx: number, option: string) {
    setMaterials((m) => m.map((row, i) => (i === idx ? { ...row, material_name: option === 'Otro' ? '' : option } : row)));
  }

  function updateMaterialCustomName(idx: number, name: string) {
    setMaterials((m) => m.map((row, i) => (i === idx ? { ...row, material_name: name } : row)));
  }

  function updateMaterialQuantity(idx: number, value: string) {
    setMaterials((m) => m.map((row, i) => (i === idx ? { ...row, quantity: Number(value) } : row)));
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
      required_pop_materials: materials.filter((m) => m.material_name.trim().length > 0)
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
          <p className="text-xs font-medium text-slate-600">Materiales solicitados</p>
          <Button type="button" size="sm" variant="outline" onClick={addMaterial}>
            <Plus size={12} /> Agregar material
          </Button>
        </div>
        {materials.map((row, idx) => {
          const isPreset = MATERIAL_PRESETS.includes(row.material_name);
          const selection = isPreset ? row.material_name : 'Otro';
          return (
            <div key={idx} className="flex items-center gap-2">
              <Select value={selection} onChange={(e) => updateMaterialOption(idx, e.target.value)} className="flex-1">
                {MATERIAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
              {selection === 'Otro' ? (
                <Input
                  placeholder="Especifica el material"
                  value={row.material_name}
                  onChange={(e) => updateMaterialCustomName(idx, e.target.value)}
                  className="flex-1"
                />
              ) : null}
              <div className="w-24 shrink-0">
                <Input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => updateMaterialQuantity(idx, e.target.value)}
                />
              </div>
              <button type="button" onClick={() => removeMaterial(idx)} className="text-slate-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
        {materials.length === 0 ? <p className="text-xs text-slate-400">No se han agregado materiales solicitados.</p> : null}
      </div>

      {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}

      <div className="sm:col-span-2 flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : event ? 'Guardar cambios' : 'Crear evento'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
