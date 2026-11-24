'use client';

import { createAuthClient } from 'better-auth/react';
import { useState } from 'react';

const client = createAuthClient();
export function LoginForm() {
  const [email, setEmail] = useState('');
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
          const response = await client.signIn.email({ email, password });
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
        Correo electrónico
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
