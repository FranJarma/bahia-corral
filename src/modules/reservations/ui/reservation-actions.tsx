'use client';
import { useState } from 'react';
export function ReservationActions({
  reservationId,
  status,
}: {
  reservationId: string;
  status: string;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function run(action: string) {
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'confirm-exception' || action === 'cancel' ? { reason } : {}),
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? 'No pudo realizarse la acción');
      setMessage('Cambio guardado. Actualizá la página para ver el nuevo estado.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="surface-card grid h-fit gap-4 p-6">
      <h2 className="editorial text-2xl">Acciones</h2>
      <label className="grid gap-2 text-sm font-semibold">
        Motivo (cuando corresponda)
        <textarea
          value={reason}
          rows={3}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo de la excepción o cancelación"
        />
      </label>
      {status === 'PENDING_CONFIRMATION' && (
        <button
          className="primary-button"
          disabled={busy || reason.trim().length < 3}
          onClick={() => void run('confirm-exception')}
        >
          Confirmar sin seña
        </button>
      )}
      {status === 'CONFIRMED' && (
        <>
          <button className="secondary-button" disabled={busy} onClick={() => void run('checkin')}>
            Registrar check-in
          </button>
          <button
            className="secondary-button"
            disabled={busy || reason.trim().length < 3}
            onClick={() => void run('cancel')}
          >
            Cancelar reserva
          </button>
        </>
      )}
      {status === 'IN_STAY' && (
        <button className="primary-button" disabled={busy} onClick={() => void run('checkout')}>
          Registrar check-out
        </button>
      )}
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
    </aside>
  );
}
