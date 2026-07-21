'use client';

import { Suspense } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { login, type AuthActionState } from '@/actions/auth.actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Ingresando…' : 'Iniciar sesión'}
    </Button>
  );
}

function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';
  const inactiveError = searchParams.get('error') === 'inactive';

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Correo</label>
        <Input type="email" name="email" placeholder="jefe.zona1@orocash.ec" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Contraseña</label>
        <Input type="password" name="password" placeholder="••••••••" required />
      </div>
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {inactiveError ? <p className="text-xs text-red-600">Tu usuario está inactivo.</p> : null}
      <SubmitButton />
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-lg font-bold text-white">
            OC
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Orocash · Inventario POP</h1>
          <p className="text-sm text-slate-500">Ingresa con tu usuario asignado</p>
        </div>
        <Suspense fallback={<div className="h-40" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
