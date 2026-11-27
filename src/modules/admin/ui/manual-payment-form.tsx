'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { pesosToCents } from '@/modules/pricing/domain/rate-bands';
import type { ReservationSummary } from '@/modules/reservations/application/list-reservations';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

const money = (cents: string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    Number(BigInt(cents)) / 100,
  );
function date(value: string) {
  return value.slice(8, 10) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4);
}

export function ManualPaymentForm({
  reservations,
  initialReservationId = '',
  lockReservation = false,
  embedded = false,
  onSaved,
  onCancel,
}: {
  reservations: ReservationSummary[];
  initialReservationId?: string;
  lockReservation?: boolean;
  embedded?: boolean;
  onSaved?: (message: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [reservationId, setReservationId] = useState(initialReservationId);
  const [amount, setAmount] = useState(''),
    [method, setMethod] = useState('TRANSFER'),
    [reference, setReference] = useState('');
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const eligible = useMemo(
    () =>
      reservations.filter(
        (row) =>
          !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(row.status) &&
          BigInt(row.amount_cents) > BigInt(row.paid_cents),
      ),
    [reservations],
  );
  const selected = eligible.find((row) => row.id === reservationId);

  async function submit() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      if (!selected) throw new Error('Elegí una reserva con saldo pendiente.');
      const amountCents = pesosToCents(amount);
      if (BigInt(amountCents) <= 0n) throw new Error('Ingresá un importe mayor a cero.');
      const data = { reservationId, amountCents, method, reference };
      const payload = JSON.stringify(data);
      if (attempt.current?.payload !== payload)
        attempt.current = { payload, key: crypto.randomUUID() };
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, idempotencyKey: attempt.current.key }),
      });
      const json = (await response.json()) as { error?: string; confirmation?: string };
      if (!response.ok) throw new Error(json.error ?? 'No se pudo registrar el pago.');
      attempt.current = null;
      setAmount('');
      setReference('');
      setReservationId('');
      const successMessage =
        json.confirmation === 'CONFLICT'
          ? 'Pago registrado. La reserva requiere revisión de disponibilidad.'
          : 'Pago registrado correctamente.';
      setMessage(successMessage);
      onSaved?.(successMessage);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el pago.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className={embedded ? 'admin-form' : 'surface-card admin-form p-6'}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {!embedded && <h2 className="editorial text-2xl">Registrar ingreso manual</h2>}
      <p className="text-sm text-muted">
        Registrá únicamente dinero que ya verificaste. Subir un comprobante no equivale a acreditar
        el pago.
      </p>
      <ValidatedLabel className="public-form-label">
        Reserva
        <select
          required
          value={reservationId}
          onChange={(e) => setReservationId(e.target.value)}
          disabled={lockReservation || !eligible.length || busy}
        >
          <option value="">
            {eligible.length ? 'Elegí una reserva' : 'No hay reservas con saldo pendiente'}
          </option>
          {eligible.map((row) => (
            <option key={row.id} value={row.id}>
              {row.reference} · {row.guest_name} · {row.unit_name} · {date(row.checkin)} al{' '}
              {date(row.checkout)} · Saldo{' '}
              {money((BigInt(row.amount_cents) - BigInt(row.paid_cents)).toString())}
            </option>
          ))}
        </select>
      </ValidatedLabel>
      {selected && (
        <p className="text-xs text-muted">
          {selected.guest_name} · {selected.unit_name} · Saldo pendiente:{' '}
          <strong>
            {money((BigInt(selected.amount_cents) - BigInt(selected.paid_cents)).toString())}
          </strong>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <ValidatedLabel className="public-form-label">
          Importe recibido (ARS)
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </ValidatedLabel>
        <label className="public-form-label">
          Medio
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="TRANSFER">Transferencia</option>
            <option value="CASH">Efectivo</option>
            <option value="DEBIT">Débito</option>
            <option value="CREDIT">Crédito</option>
          </select>
        </label>
      </div>
      <label className="public-form-label">
        Referencia (opcional)
        <input value={reference} onChange={(e) => setReference(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-positive">
          {message}
        </p>
      )}
      <div className={embedded ? 'admin-form-actions' : 'flex'}>
        {onCancel && (
          <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button className="primary-button w-fit" disabled={busy || !eligible.length}>
          {busy ? 'Registrando…' : 'Registrar pago'}
        </button>
      </div>
    </form>
  );
}
