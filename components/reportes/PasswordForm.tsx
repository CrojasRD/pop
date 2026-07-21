'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Input, FormField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { updateOwnPassword } from '@/actions/settings.actions';
import type { ActionResult } from '@/actions/inventory.actions';

const initialState: ActionResult = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" disabled={pending}>{pending ? 'Guardando…' : 'Actualizar contraseña'}</Button>;
}

export function PasswordForm() {
  const [state, formAction] = useFormState(updateOwnPassword, initialState);

  return (
    <form action={formAction} className="space-y-3 border-t border-slate-100 pt-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nueva contraseña">
          <Input name="password" type="password" minLength={8} required />
        </FormField>
        <FormField label="Confirmar contraseña">
          <Input name="confirm" type="password" minLength={8} required />
        </FormField>
      </div>
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-xs text-emerald-600">Contraseña actualizada correctamente.</p> : null}
      <SubmitButton />
    </form>
  );
}
