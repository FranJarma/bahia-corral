'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';

import type { ReservationSummary } from '@/modules/reservations/application/list-reservations';
import {
  formatReservationDate,
  formatReservationMoney,
} from '@/modules/reservations/ui/reservation-format';
import { AdminDialog } from '@/modules/shared-ui/admin-dialog';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

export function ReservationActions({
  reservation,
  embedded = false,
  onSaved,
}: {
  reservation: ReservationSummary;
  embedded?: boolean;
  onSaved?: () => void;
}) {
  const { id: reservationId, status } = reservation;
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReasonError, setCancelReasonError] = useState('');
  const cancelReasonErrorId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canCancel = ['PENDING_CONFIRMATION', 'CONFIRMED'].includes(status);
  const canAct = canCancel || status === 'IN_STAY';

  async function run(action: string, actionReason = reason): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'confirm-exception' || action === 'cancel'
            ? { reason: actionReason.trim() }
            : {}),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No pudo realizarse la acción');
      setMessage(
        action === 'cancel'
          ? 'Reserva anulada. El alojamiento vuelve a estar disponible.'
          : 'Cambio guardado.',
      );
      router.refresh();
      onSaved?.();
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No se pudo guardar el cambio. Intentá nuevamente.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function cancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cancelReason.trim().length < 3) {
      setCancelReasonError('Ingresá un motivo de al menos 3 caracteres.');
      return;
    }
    if (await run('cancel', cancelReason)) {
      setCancelOpen(false);
      setCancelReason('');
    }
  }

  if (!canAct) return null;

  return (
    <aside
      className={
        embedded ? 'grid gap-4 border-t border-[#e1d5c5] pt-6' : 'surface-card grid h-fit gap-4 p-6'
      }
    >
      {canAct && <h2 className="editorial text-2xl">Acciones</h2>}
      {status === 'PENDING_CONFIRMATION' && (
        <>
          <label className="grid gap-2 text-sm font-semibold">
            Motivo para confirmar sin seña
            <textarea
              value={reason}
              rows={3}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo de la excepción"
            />
          </label>
          <button
            className="primary-button"
            disabled={busy || reason.trim().length < 3}
            onClick={() => void run('confirm-exception')}
          >
            Confirmar sin seña
          </button>
        </>
      )}
      {status === 'CONFIRMED' && (
        <button className="secondary-button" disabled={busy} onClick={() => void run('checkin')}>
          Registrar check-in
        </button>
      )}
      {canCancel && (
        <>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => {
              setError('');
              setCancelReasonError('');
              setCancelOpen(true);
            }}
          >
            Anular reserva
          </button>
          <AdminDialog
            nested
            open={cancelOpen}
            onOpenChange={(open) => {
              if (!busy) {
                setCancelOpen(open);
                setError('');
                setCancelReasonError('');
              }
            }}
            title="¿Anular esta reserva?"
            description={
              reservation.reference + ' · ' + reservation.guest_name + ' · ' + reservation.unit_name
            }
          >
            <form className="admin-form" onSubmit={(event) => void cancel(event)} aria-busy={busy}>
              <p className="text-sm leading-6">
                El alojamiento quedará disponible del {formatReservationDate(reservation.checkin)}{' '}
                al {formatReservationDate(reservation.checkout)}. El importe abonado es de{' '}
                {formatReservationMoney(reservation.paid_cents)}; cualquier devolución se gestiona
                por separado.
              </p>
              <p className="text-xs leading-6 text-muted">
                La anulación queda registrada en el historial y no cancela pagos que ya estén en
                curso.
              </p>
              <ValidatedLabel className="public-form-label">
                Motivo de anulación
                <input
                  required
                  minLength={3}
                  value={cancelReason}
                  disabled={busy}
                  placeholder="Ingresá el motivo"
                  aria-invalid={cancelReasonError ? true : undefined}
                  aria-describedby={cancelReasonError ? cancelReasonErrorId : undefined}
                  onChange={(event) => {
                    setCancelReason(event.target.value);
                    setCancelReasonError('');
                  }}
                />
              </ValidatedLabel>
              {cancelReasonError && (
                <p id={cancelReasonErrorId} role="alert" className="text-sm text-red-700">
                  {cancelReasonError}
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => setCancelOpen(false)}
                >
                  Mantener reserva
                </button>
                <button type="submit" className="primary-button" disabled={busy}>
                  {busy ? 'Anulando…' : 'Confirmar anulación'}
                  {!busy && <ArrowRight size={16} aria-hidden="true" />}
                </button>
              </div>
            </form>
          </AdminDialog>
        </>
      )}
      {status === 'IN_STAY' && (
        <button className="primary-button" disabled={busy} onClick={() => void run('checkout')}>
          Registrar check-out
        </button>
      )}
      {error && !cancelOpen && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-positive">
          {message}
        </p>
      )}
    </aside>
  );
}
