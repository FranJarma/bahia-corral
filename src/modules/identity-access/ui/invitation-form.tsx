'use client';

import { createAuthClient } from 'better-auth/react';
import { useState } from 'react';

const auth = createAuthClient();

export function InvitationForm({ token }: { token: string }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'register' | 'accept'>('register');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'register') {
        const response = await auth.signUp.email({ name, email, password });
        if (response.error) throw new Error('No pudimos registrar la cuenta. Revisá los datos.');
        setMode('accept');
        setMessage(
          'Cuenta registrada. Verificá tu correo, iniciá sesión y volvé a aceptar la invitación.',
        );
      } else {
        const response = await fetch('/api/admin/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const json = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(json.error || 'No pudimos aceptar la invitación');
        window.location.assign('/admin');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="surface-card mx-auto grid max-w-md gap-4 p-8"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h1 className="editorial text-3xl">Invitación al equipo</h1>
      <p className="text-sm text-muted">
        Necesitás una cuenta personal con correo verificado para acceder al dashboard.
      </p>
      {mode === 'register' && (
        <>
          <label className="grid gap-2 text-sm font-semibold">
            Nombre completo
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Correo invitado
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Elegí una contraseña
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
        </>
      )}
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={loading}>
        {loading
          ? 'Procesando…'
          : mode === 'register'
            ? 'Crear cuenta personal'
            : 'Aceptar invitación'}
      </button>
      <button
        className="secondary-button"
        type="button"
        onClick={() => setMode(mode === 'register' ? 'accept' : 'register')}
      >
        {mode === 'register' ? 'Ya tengo cuenta e inicié sesión' : 'Necesito crear una cuenta'}
      </button>
    </form>
  );
}
