'use client';
import type { ReservationSummary } from '@/modules/reservations/application/list-reservations';
import { ReservationActions } from '@/modules/reservations/ui/reservation-actions';
import {
  formatReservationDate,
  formatReservationMoney,
  reservationStatusLabel,
} from '@/modules/reservations/ui/reservation-format';
export function ReservationDetails({
  reservation: r,
  onSaved,
}: {
  reservation: ReservationSummary;
  onSaved?: () => void;
}) {
  const balance = BigInt(r.amount_cents) - BigInt(r.paid_cents);
  return (
    <div className="grid gap-7">
      <section aria-label="Información de la estadía">
        <span
          className={
            'status-pill ' +
            (r.status === 'PENDING_CONFIRMATION'
              ? 'status-pill--pending'
              : r.status === 'CANCELLED'
                ? 'status-pill--cancelled'
                : 'status-pill--confirmed')
          }
        >
          {reservationStatusLabel(r.status)}
        </span>
        <h3 className="editorial mt-5 break-words text-[26px]">{r.guest_name}</h3>
        <p className="mt-2 text-sm">{r.unit_name}</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Llegada</dt>
            <dd className="mt-1 font-semibold">{formatReservationDate(r.checkin)}</dd>
          </div>
          <div>
            <dt className="text-muted">Salida</dt>
            <dd className="mt-1 font-semibold">{formatReservationDate(r.checkout)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Teléfono</dt>
            <dd className="mt-1 break-words">{r.guest_phone}</dd>
          </div>
        </dl>
        <dl className="mt-6 grid gap-3 border-t border-[#e1d5c5] pt-5 text-sm">
          {[
            ['Total de la estadía', r.amount_cents],
            ['Importe abonado', r.paid_cents],
            [
              balance < 0n ? 'Crédito a favor' : 'Saldo pendiente',
              (balance < 0n ? -balance : balance).toString(),
            ],
          ].map(([label, amount]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt>{label}</dt>
              <dd className="shrink-0 font-semibold tabular-nums">
                {formatReservationMoney(amount)}
              </dd>
            </div>
          ))}
        </dl>
        {r.status === 'NOT_COMPLETED' && (
          <p className="mt-4 text-sm leading-6 text-muted">Esta reserva no llegó a confirmarse.</p>
        )}
      </section>
      <ReservationActions reservationId={r.id} status={r.status} embedded onSaved={onSaved} />
    </div>
  );
}
