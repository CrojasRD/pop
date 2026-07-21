'use client';

import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { Input, Select, Textarea, FormField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createPopItem, type ActionResult } from '@/actions/inventory.actions';
import type { PopCategory } from '@/lib/types';

const initialState: ActionResult = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar material'}</Button>;
}

export function InventoryForm({ categories }: { categories: PopCategory[] }) {
  const router = useRouter();
  const [state, formAction] = useFormState(async (prev: ActionResult, formData: FormData) => {
    const result = await createPopItem(prev, formData);
    if (result.success) router.push('/inventario');
    return result;
  }, initialState);

  return (
    <form action={formAction} className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Nombre del producto">
        <Input name="name" required placeholder="Ej. Roll up institucional" />
      </FormField>
      <FormField label="Categoría">
        <Select name="category_id" required defaultValue="">
          <option value="" disabled>Selecciona una categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Código interno">
        <Input name="internal_code" required placeholder="Ej. RU-002" />
      </FormField>
      <FormField label="Cantidad total disponible">
        <Input name="total_quantity" type="number" min={0} required defaultValue={0} />
      </FormField>
      <FormField label="Stock mínimo (alerta de bajo stock)">
        <Input name="low_stock_threshold" type="number" min={0} defaultValue={5} />
      </FormField>
      <FormField label="URL de imagen (opcional)">
        <Input name="image_url" placeholder="https://…" />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Descripción">
          <Textarea name="description" rows={3} placeholder="Detalles del material…" />
        </FormField>
      </div>

      {state?.error ? <p className="sm:col-span-2 text-sm text-red-600">{state.error}</p> : null}

      <div className="sm:col-span-2 flex gap-2">
        <SubmitButton />
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
