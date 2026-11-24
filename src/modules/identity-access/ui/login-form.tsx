'use client';

import Link from 'next/link';
import { useState } from 'react';

import { authClient } from '@/modules/identity-access/ui/auth-client';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="mt-8 grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
          const response = await authClient.signIn.username({
            username: username.trim().toLowerCase(),
            password,
          });
          if (response.error)
            setError('No fue posible iniciar sesión. Revisá tus datos o verificá tu correo.');
          else window.location.assign('/admin');
        } catch {
          setError('No pudimos comunicarnos con el servidor.');
        } finally {
          setLoading(false);
        }
      }}
    >
      <label className="grid gap-2 text-sm font-semibold">
        Nombre de usuario
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Contraseña
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <div className="flex justify-end">
        <Link
          href="/admin/recuperar-contrasena"
          className="text-xs font-semibold text-ink underline underline-offset-4"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button className="primary-button w-full" type="submit" disabled={loading}>
        {loading ? 'Ingresando…' : 'Ingresar al dashboard'}
      </button>
    </form>
  );
}
