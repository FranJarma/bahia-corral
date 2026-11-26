'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import type { RefundSummary } from '@/modules/payments/application/get-refunds';
import { centsToMoney, moneyToCents } from '@/modules/payments/domain/money';
import { formatReservationMoney as money } from '@/modules/reservations/ui/reservation-format';
import { AdminDialog } from '@/modules/shared-ui/admin-dialog';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

const labels = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  PROCESSING: 'En proceso',
  UNCERTAIN: 'En verificación',
  REJECTED: 'Rechazada',
  EXECUTED: 'Devuelta',
  FAILED: 'No realizada',
} as const;
type Refund = RefundSummary['refunds'][number];
async function readSummary(reservationId: string): Promise<RefundSummary> {
  const response = await fetch(
    '/api/admin/refunds?reservationId=' + encodeURIComponent(reservationId),
    { cache: 'no-store' },
  );
  const data = (await response.json()) as { summary: RefundSummary; error?: string };
  if (!response.ok) throw new Error(data.error ?? 'No pudimos consultar las devoluciones.');
  return data.summary;
}
export function RefundPanel({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<RefundSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [mode, setMode] = useState('FULL');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [executeTarget, setExecuteTarget] = useState<Refund | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Refund | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  useEffect(() => {
    let active = true;
    readSummary(reservationId)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((failure) => {
        if (active)
          setError(
            failure instanceof Error ? failure.message : 'No pudimos consultar las devoluciones.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reservationId]);
  const eligible =
    summary?.payments.filter((p) => !p.blockedReason && BigInt(p.availableCents) > 0n) ?? [];
  const selected = eligible.find((p) => p.id === paymentId) ?? eligible[0];
  async function post(data: Record<string, unknown>) {
    if (busy) return null;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { id: string; status: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'No pudimos completar la devolución.');
      setSummary(await readSummary(reservationId));
      router.refresh();
      return result;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No pudimos completar la devolución.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    let amountCents: bigint;
    try {
      amountCents = moneyToCents(
        mode === 'FULL' ? centsToMoney(BigInt(selected.availableCents)) : amount,
      );
      if (amountCents <= 0n || amountCents > BigInt(selected.availableCents))
        throw new Error('Ingresá un importe dentro del saldo disponible.');
      if (reason.trim().length < 3) throw new Error('Ingresá un motivo de al menos 3 caracteres.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Revisá el importe y el motivo.');
      return;
    }
    const data = {
      action: 'request',
      reservationId,
      paymentId: selected.id,
      amountCents: amountCents.toString(),
      reason: reason.trim(),
    };
    const payload = JSON.stringify(data);
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    if (await post({ ...data, idempotencyKey: attempt.current.key })) {
      attempt.current = null;
      setReason('');
      setAmount('');
      setMessage(
        'Solicitud registrada. Requiere aprobación del Administrador antes de enviar dinero.',
      );
    }
  }
  async function sendRefund() {
    if (!executeTarget) return;
    const result = await post({ action: 'execute', refundId: executeTarget.id });
    if (result) {
      setExecuteTarget(null);
      setMessage(
        result.status === 'EXECUTED'
          ? 'Devolución confirmada por Mercado Pago.'
          : result.status === 'FAILED'
            ? 'Mercado Pago no completó la devolución. Revisá el motivo registrado.'
            : 'La devolución está en verificación. Consultá su estado antes de volver a operar.',
      );
    }
  }
  async function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 3) {
      setError('Ingresá el motivo del rechazo.');
      return;
    }
    if (await post({ action: 'reject', refundId: rejectTarget.id, reason: rejectReason.trim() })) {
      setRejectTarget(null);
      setMessage('La solicitud quedó rechazada y registrada en el historial.');
    }
  }
  const modalOpen = Boolean(executeTarget || rejectTarget);
  return (
    <section
      aria-label="Devoluciones de la reserva"
      className="grid gap-5 border-t border-[#e1d5c5] pt-6"
    >
      <h2 className="editorial text-2xl">Devoluciones</h2>
      {loading && (
        <p role="status" className="text-sm text-muted">
          Consultando pagos y devoluciones…
        </p>
      )}
      {error && !modalOpen && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!loading && !summary && (
        <button
          className="secondary-button"
          onClick={() => {
            void readSummary(reservationId)
              .then((data) => {
                setSummary(data);
                setError('');
              })
              .catch(() => setError('No pudimos consultar las devoluciones. Intentá nuevamente.'));
          }}
        >
          Volver a consultar
        </button>
      )}
      {summary && (
        <>
          <p className="text-sm leading-6 text-muted">
            Solicitá el reintegro total o parcial de un cobro de Mercado Pago. La aprobación no
            envía dinero; el Administrador debe confirmar la devolución.
          </p>
          {!summary.providerConfigured && (
            <p className="text-sm leading-6 text-muted">
              Las devoluciones con Mercado Pago todavía no están habilitadas en este entorno. Las
              solicitudes quedan registradas.
            </p>
          )}
          {eligible.length > 0 && summary.reservationStatus === 'CANCELLED' && (
            <form
              className="admin-form"
              onSubmit={(event) => void request(event)}
              aria-busy={busy}
              aria-label="Solicitar devolución"
            >
              <div className="grid gap-2">
              <ValidatedLabel className="public-form-label">
                Pago a devolver
                <select
                  aria-describedby={'refund-available-' + reservationId}
                  required
                  value={selected?.id ?? ''}
                  disabled={busy}
                  onChange={(event) => {
                    setPaymentId(event.target.value);
                    setAmount('');
                  }}
                >
                  {eligible.map((payment) => (
                    <option key={payment.id} value={payment.id}>
                      {new Intl.DateTimeFormat('es-AR').format(new Date(payment.paidAt))} ·{' '}
                      {money(payment.availableCents)}
                    </option>
                  ))}
                </select>
              </ValidatedLabel>
              <p id={'refund-available-' + reservationId} className="text-sm leading-6 text-muted">
                Disponible para devolver:{' '}
                <strong className="font-semibold text-brand">{money(selected?.availableCents ?? '0')}</strong>
              </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="public-form-label">
                  Tipo de devolución
                  <select
                    value={mode}
                    disabled={busy}
                    onChange={(event) => setMode(event.target.value)}
                  >
                    <option value="FULL">Total disponible</option>
                    <option value="PARTIAL">Parcial</option>
                  </select>
                </label>
                <ValidatedLabel className="public-form-label">
                  Importe a devolver (ARS)
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={selected ? centsToMoney(BigInt(selected.availableCents)) : '0'}
                    readOnly={mode === 'FULL'}
                    disabled={busy}
                    value={
                      mode === 'FULL' && selected
                        ? centsToMoney(BigInt(selected.availableCents))
                        : amount
                    }
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </ValidatedLabel>
              </div>
              <ValidatedLabel className="public-form-label">
                Motivo de la devolución
                <textarea
                  required
                  minLength={3}
                  maxLength={1000}
                  rows={3}
                  value={reason}
                  disabled={busy}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Registrá el motivo y el importe acordado con el huésped"
                />
              </ValidatedLabel>
              <button type="submit" className="primary-button justify-self-start" disabled={busy}>
                {busy ? 'Guardando…' : 'Solicitar devolución'}
              </button>
            </form>
          )}
          {summary.payments.length === 0 && (
            <p className="text-sm leading-6 text-muted">
              No hay cobros de Mercado Pago habilitados para devolver. Los pagos manuales se
              reintegran por su medio de origen.
            </p>
          )}
          {summary.payments.length > 0 && eligible.length === 0 && (
            <p className="text-sm leading-6 text-muted">
              {summary.payments.some((p) => p.blockedReason)
                ? 'Hay solicitudes pendientes o pagos que requieren revisión. Revisá el historial antes de iniciar otra devolución.'
                : 'No queda un importe disponible para devolver por Mercado Pago.'}
            </p>
          )}
          {summary.refunds.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Historial de devoluciones</h3>
              <ul aria-label="Historial de devoluciones" className="grid gap-5">
                {summary.refunds.map((refund) => (
                  <li key={refund.id} className="grid gap-3 border-t border-[#e1d5c5] pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-sm tabular-nums">{money(refund.amountCents)}</strong>
                      <span
                        className={
                          'status-pill ' +
                          (refund.status === 'EXECUTED'
                            ? 'status-pill--confirmed'
                            : ['REJECTED', 'FAILED'].includes(refund.status)
                              ? 'status-pill--cancelled'
                              : 'status-pill--pending')
                        }
                      >
                        {labels[refund.status]}
                      </span>
                    </div>
                    <p className="break-words text-sm leading-6">{refund.reason}</p>
                    {refund.source === 'PROVIDER' && (
                      <p className="text-xs text-muted">Registrada directamente en Mercado Pago.</p>
                    )}
                    {refund.providerRefundId && (
                      <p className="break-all text-xs leading-5 text-muted">
                        Referencia de Mercado Pago: {refund.providerRefundId}
                      </p>
                    )}
                    {refund.error && (
                      <p className="text-sm leading-6 text-red-700">{refund.error}</p>
                    )}
                    {refund.decisionReason && (
                      <p className="text-sm text-muted">
                        Motivo del rechazo: {refund.decisionReason}
                      </p>
                    )}
                    {refund.status === 'EXECUTED' && (
                      <p className="text-xs leading-5 text-muted">
                        Confirmada por Mercado Pago. La acreditación al huésped depende de su medio
                        de pago.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {summary.canApprove &&
                        refund.paymentId &&
                        refund.source === 'ADMIN' &&
                        refund.status === 'REQUESTED' && (
                          <button
                            className="secondary-button"
                            disabled={busy}
                            onClick={() => {
                              void post({ action: 'approve', refundId: refund.id }).then(
                                (result) => {
                                  if (result)
                                    setMessage(
                                      'Solicitud aprobada. Confirmá la devolución para enviar el dinero.',
                                    );
                                },
                              );
                            }}
                          >
                            Aprobar solicitud
                          </button>
                        )}
                      {summary.canApprove &&
                        refund.paymentId &&
                        refund.source === 'ADMIN' &&
                        refund.status === 'APPROVED' && (
                          <button
                            className="primary-button"
                            disabled={busy || !summary.providerConfigured}
                            title={
                              !summary.providerConfigured
                                ? 'Mercado Pago debe estar configurado para enviar la devolución.'
                                : undefined
                            }
                            onClick={() => {
                              setError('');
                              setExecuteTarget(refund);
                            }}
                          >
                            Devolver con Mercado Pago
                          </button>
                        )}
                      {summary.canApprove &&
                        refund.paymentId &&
                        refund.source === 'ADMIN' &&
                        ['REQUESTED', 'APPROVED'].includes(refund.status) && (
                          <button
                            className="secondary-button"
                            disabled={busy}
                            onClick={() => {
                              setError('');
                              setRejectReason('');
                              setRejectTarget(refund);
                            }}
                          >
                            Rechazar solicitud
                          </button>
                        )}
                      {['PROCESSING', 'UNCERTAIN'].includes(refund.status) && (
                        <button
                          className="secondary-button"
                          disabled={busy || !summary.providerConfigured}
                          onClick={() => {
                            void post({ action: 'reconcile', refundId: refund.id }).then(
                              (result) => {
                                if (result)
                                  setMessage(
                                    result.status === 'EXECUTED'
                                      ? 'Devolución confirmada por Mercado Pago.'
                                      : 'Estado actualizado. Si sigue en verificación, no se enviará otro reintegro.',
                                  );
                              },
                            );
                          }}
                        >
                          Consultar estado
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {message && (
        <p role="status" className="text-sm leading-6 text-brand">
          {message}
        </p>
      )}
      <AdminDialog
        nested
        open={executeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setExecuteTarget(null);
        }}
        title="Confirmar devolución"
        description={(summary?.reference ?? '') + ' · Mercado Pago'}
      >
        <div className="grid gap-5">
          <p className="text-sm leading-7">
            Se enviará a Mercado Pago una devolución de{' '}
            <strong>{executeTarget ? money(executeTarget.amountCents) : ''}</strong> vinculada al
            pago original. Confirmá el importe antes de continuar.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setExecuteTarget(null)}
            >
              Volver
            </button>
            <button className="primary-button" disabled={busy} onClick={() => void sendRefund()}>
              {busy ? 'Enviando…' : 'Confirmar devolución'}
            </button>
          </div>
        </div>
      </AdminDialog>
      <AdminDialog
        nested
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setRejectTarget(null);
        }}
        title="Rechazar solicitud"
        description={summary?.reference ?? ''}
      >
        <form className="admin-form" onSubmit={(event) => void reject(event)}>
          <ValidatedLabel className="public-form-label">
            Motivo del rechazo
            <textarea
              required
              minLength={3}
              maxLength={1000}
              value={rejectReason}
              disabled={busy}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          </ValidatedLabel>
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
              onClick={() => setRejectTarget(null)}
            >
              Volver
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? 'Guardando…' : 'Confirmar rechazo'}
            </button>
          </div>
        </form>
      </AdminDialog>
    </section>
  );
}
