'use client';
import { useState } from 'react';

import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

export function OtpAccess() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(
        step === 'REQUEST' ? '/api/public/otp/request' : '/api/public/otp/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference, email, ...(step === 'VERIFY' ? { code } : {}) }),
        },
      );
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No pudimos verificar el código');
      if (step === 'REQUEST') {
        setStep('VERIFY');
        setMessage(data.message ?? 'Revisá tu correo.');
      } else {
        window.location.assign(`/mis-reservas?referencia=${encodeURIComponent(reference.trim())}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible continuar');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="surface-card grid gap-4 p-7"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="editorial text-2xl">
        {step === 'REQUEST' ? 'Recibí un código por email' : 'Ingresá tu código'}
      </h2>
      <p className="text-sm leading-relaxed text-muted">
        {step === 'REQUEST'
          ? 'Utilizá la referencia de reserva y el correo que registraste al reservar.'
          : 'El código tiene seis dígitos y vence a los cinco minutos.'}
      </p>
      <ValidatedLabel className="grid gap-2 text-sm font-semibold">
        Referencia de reserva
        <input
          required
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          disabled={step === 'VERIFY'}
        />
      </ValidatedLabel>
      <ValidatedLabel className="grid gap-2 text-sm font-semibold">
        Correo electrónico
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={step === 'VERIFY'}
        />
      </ValidatedLabel>
      {step === 'VERIFY' && (
        <ValidatedLabel className="grid gap-2 text-sm font-semibold">
          Código de seis dígitos
          <input
            required
            pattern="[0-9]{6}"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </ValidatedLabel>
      )}
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? 'Procesando…' : step === 'REQUEST' ? 'Enviar código' : 'Ver mi reserva'}
      </button>
    </form>
  );
}
