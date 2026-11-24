'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { authClient } from '@/modules/identity-access/ui/auth-client';

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      const { error: requestError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (requestError) {
        setError('El enlace no es válido o ya venció. Solicitá uno nuevo.');
        return;
      }
      setDone(true);
    } catch {
      setError('No pudimos completar el restablecimiento. Intentá nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 grid gap-5 text-center">
        <p role="status" className="text-sm leading-7 text-muted">
          Contraseña actualizada. Ya podés ingresar con tu nombre de usuario.
        </p>
        <Link href="/admin/login" className="primary-button w-full">
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-8 grid gap-5" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-semibold">
        Nueva contraseña
        <input
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Confirmar nueva contraseña
        <input
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
        />
      </label>
      <p className="text-xs leading-6 text-muted">
        Usá al menos 12 caracteres y una contraseña exclusiva para esta cuenta.
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button className="primary-button w-full" type="submit" disabled={busy}>
        {busy ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
