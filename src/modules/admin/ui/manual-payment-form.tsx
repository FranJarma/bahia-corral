'use client';
import { useState } from 'react';
export function ManualPaymentForm() {
  const [reservationId, setReservationId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('TRANSFER');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      const value = Number(amount);
      if (!Number.isInteger(value) || value <= 0)
        throw new Error('Ingresá un importe entero en pesos');
      const r = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          amountCents: String(BigInt(value) * 100n),
          method,
          reference,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? 'Error');
      setMessage('Ingreso registrado. Actualizá la página para verlo.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="surface-card grid gap-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="editorial text-2xl">Registrar ingreso manual</h2>
      <p className="text-sm text-muted">
        Registrá únicamente dinero que ya verificaste. Subir un comprobante no equivale a acreditar
        el pago.
      </p>
      <label className="grid gap-2 text-sm font-semibold">
        ID de reserva
        <input
          required
          placeholder="UUID de la reserva"
          value={reservationId}
          onChange={(e) => setReservationId(e.target.value)}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Importe recibido (ARS)
          <input
            required
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Medio
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="TRANSFER">Transferencia</option>
            <option value="CASH">Efectivo</option>
            <option value="DEBIT">Débito</option>
            <option value="CREDIT">Crédito</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        Referencia (opcional)
        <input value={reference} onChange={(e) => setReference(e.target.value)} />
      </label>
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
      <button className="primary-button w-fit" disabled={busy}>
        {busy ? 'Registrando…' : 'Registrar pago'}
      </button>
    </form>
  );
}
