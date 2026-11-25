'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { authClient } from '@/modules/identity-access/ui/auth-client';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/admin/restablecer-contrasena`,
      });
      if (requestError) {
        setError('No pudimos procesar la solicitud. Volvé a intentar más tarde.');
        return;
      }
      setSent(true);
    } catch {
      setError('No pudimos comunicarnos con el servidor.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-8 space-y-5 text-center">
        <p role="status" className="text-sm leading-7 text-muted">
          Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer la
          contraseña. Revisá también la carpeta de correo no deseado.
        </p>
        <Link href="/admin/login" className="secondary-button w-full">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-8 grid gap-5" onSubmit={submit}>
      <ValidatedLabel className="grid gap-2 text-sm font-semibold">
        Correo electrónico asociado a tu usuario
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </ValidatedLabel>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button className="primary-button w-full" type="submit" disabled={sending}>
        {sending ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>
      <Link
        href="/admin/login"
        className="text-center text-xs font-semibold underline underline-offset-4"
      >
        Volver al acceso
      </Link>
    </form>
  );
}
