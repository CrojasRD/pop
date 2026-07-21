'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Input, FormField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createCategory } from '@/actions/settings.actions';
import type { ActionResult } from '@/actions/inventory.actions';
import type { PopCategory } from '@/lib/types';

const initialState: ActionResult = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" disabled={pending}>{pending ? 'Guardando…' : 'Agregar categoría'}</Button>;
}

export function CategoryManager({ categories }: { categories: PopCategory[] }) {
  const [state, formAction] = useFormState(createCategory, initialState);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{c.name}</span>
        ))}
      </div>
      <form action={formAction} className="flex items-end gap-2 border-t border-slate-100 pt-3">
        <FormField label="Nueva categoría">
          <Input name="name" placeholder="Ej. Displays de mostrador" required />
        </FormField>
        <SubmitButton />
      </form>
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </div>
  );
}
