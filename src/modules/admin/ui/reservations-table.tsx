'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ManualPaymentForm } from '@/modules/admin/ui/manual-payment-form';
import type { ReservationSummary } from '@/modules/reservations/application/list-reservations';
import { EditReservationForm } from '@/modules/reservations/ui/edit-reservation-form';
import { ReservationDetails } from '@/modules/reservations/ui/reservation-details';
import {
  formatReservationDate as date,
  formatReservationMoney as peso,
  RESERVATION_STATUS_LABELS as statuses,
} from '@/modules/reservations/ui/reservation-format';
import { AdminDialog } from '@/modules/shared-ui/admin-dialog';
import { SearchField } from '@/modules/shared-ui/search-field';

const actionClassName =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-semibold hover:bg-cream hover:underline disabled:cursor-not-allowed disabled:opacity-40';
const archivedStatuses = ['COMPLETED', 'CANCELLED', 'NOT_COMPLETED', 'NO_SHOW'];
export function ReservationsTable({
  rows,
  initialReservationId,
}: {
  rows: ReservationSummary[];
  initialReservationId?: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState<{
    mode: 'view' | 'edit' | 'payment';
    reservation: ReservationSummary;
  } | null>(() => {
    const reservation = rows.find((r) => r.id === initialReservationId);
    return reservation ? { mode: 'view', reservation } : null;
  });
  const selected = active
    ? (rows.find((r) => r.id === active.reservation.id) ?? active.reservation)
    : null;
  const [message, setMessage] = useState('');
  function saved(text: string) {
    setActive(null);
    setMessage(text);
    router.refresh();
  }
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [unit, setUnit] = useState('ALL');
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(0);
  const units = useMemo(() => Array.from(new Set(rows.map((r) => r.unit_name))).sort(), [rows]);
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (archived !== archivedStatuses.includes(r.status)) return false;
        if (status !== 'ALL' && r.status !== status) return false;
        if (unit !== 'ALL' && r.unit_name !== unit) return false;
        return [r.reference, r.guest_name, r.unit_name].some((v) =>
          v.toLocaleLowerCase('es-AR').includes(query.toLocaleLowerCase('es-AR')),
        );
      }),
    [rows, query, status, unit, archived],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const visible = filtered.slice(
    Math.min(page, pages - 1) * 5,
    (Math.min(page, pages - 1) + 1) * 5,
  );
  function filter(change: () => void) {
    change();
    setPage(0);
  }
  return (
    <section aria-label="Listado y filtros de reservas" className="w-full">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          className="tertiary-button text-xs"
          onClick={() => filter(() => setArchived((value) => !value))}
        >
          {archived ? 'Ver reservas actuales' : 'Ver archivados'}
        </button>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(220px,1.8fr)_1fr_1fr] xl:grid-cols-[minmax(280px,1.8fr)_1fr_1fr_1fr]">
        <SearchField
          label="Buscar reserva"
          value={query}
          placeholder="Reserva, huésped o alojamiento"
          onChange={(value) => filter(() => setQuery(value))}
        />
        <label className="public-form-label">
          Estado
          <select value={status} onChange={(e) => filter(() => setStatus(e.target.value))}>
            <option value="ALL">Todos los estados</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="public-form-label">
          Alojamiento
          <select value={unit} onChange={(e) => filter(() => setUnit(e.target.value))}>
            <option value="ALL">Todos los alojamientos</option>
            {units.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="public-form-label hidden xl:flex">
          Fecha
          <select disabled defaultValue="all">
            <option value="all">Todas las fechas</option>
          </select>
        </label>
      </div>
      {message && (
        <p role="status" className="mb-4 text-sm text-positive">
          {message}
        </p>
      )}
      <div className="overflow-x-auto rounded-[12px] bg-cream-soft" data-reservations-scroll>
        <table className="admin-table min-w-[850px]">
          <thead>
            <tr>
              {[
                'Reserva / huésped / alojamiento',
                'Llegada / salida',
                'Total / pago',
                'Estado',
                'Acciones',
              ].map((t) => (
                <th scope="col" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const paid = BigInt(r.paid_cents),
                total = BigInt(r.amount_cents),
                isPending = r.status === 'PENDING_CONFIRMATION';
              const canEdit = ['CONFIRMED', 'IN_STAY'].includes(r.status);
              const canPay =
                paid < total && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(r.status);
              return (
                <tr key={r.id}>
                  <td>
                    <button
                      type="button"
                      className="min-h-11 text-left font-semibold hover:underline"
                      onClick={() => setActive({ mode: 'view', reservation: r })}
                    >
                      {r.reference}
                    </button>
                    <p className="mt-1">{r.guest_name}</p>
                    <p className="mt-1 text-muted">{r.unit_name}</p>
                  </td>
                  <td>
                    {date(r.checkin)}
                    <p className="mt-1 text-muted">{date(r.checkout)}</p>
                  </td>
                  <td className="text-right">
                    {peso(r.amount_cents)}
                    <p
                      className={`mt-1 text-[10px] ${paid >= total ? 'text-[#176a4f]' : paid > 0 ? 'text-[#1b5c84]' : 'text-[#895b18]'}`}
                    >
                      {paid >= total ? 'Pago completo' : paid > 0 ? 'Seña recibida' : 'Pendiente'}
                    </p>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${isPending ? 'status-pill--pending' : r.status === 'CANCELLED' ? 'status-pill--cancelled' : 'status-pill--confirmed'}`}
                    >
                      {statuses[r.status] ?? r.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <button
                        type="button"
                        className={actionClassName}
                        onClick={() => setActive({ mode: 'view', reservation: r })}
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        className={actionClassName}
                        disabled={!canEdit}
                        title={
                          canEdit
                            ? 'Editar la reserva'
                            : 'La edición está disponible para reservas confirmadas o en estadía.'
                        }
                        onClick={() => {
                          setMessage('');
                          setActive({ mode: 'edit', reservation: r });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={actionClassName}
                        disabled={!canPay}
                        title={
                          canPay
                            ? 'Registrar un pago para esta reserva'
                            : paid >= total
                              ? 'La reserva no tiene saldo pendiente.'
                              : 'No se pueden registrar pagos en una reserva cerrada.'
                        }
                        onClick={() => {
                          setMessage('');
                          setActive({ mode: 'payment', reservation: r });
                        }}
                      >
                        Registrar Pago
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-12 text-center text-sm text-muted">
            No se encontraron reservas para los filtros elegidos.
          </p>
        )}
      </div>
      <AdminDialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
        title={
          active?.mode === 'view'
            ? 'Reserva ' + active.reservation.reference
            : active?.mode === 'edit'
              ? 'Editar reserva'
              : 'Registrar Pago'
        }
        description={
          active
            ? active.reservation.reference +
              ' · ' +
              active.reservation.guest_name +
              ' · ' +
              active.reservation.unit_name
            : ''
        }
      >
        {active?.mode === 'view' && selected ? (
          <ReservationDetails reservation={selected} onSaved={() => router.refresh()} />
        ) : active?.mode === 'edit' ? (
          <EditReservationForm
            key={active.reservation.id}
            reservationId={active.reservation.id}
            onSaved={() => saved('Reserva actualizada correctamente.')}
            onCancel={() => setActive(null)}
          />
        ) : (
          active && (
            <ManualPaymentForm
              key={active.reservation.id}
              reservations={[active.reservation]}
              initialReservationId={active.reservation.id}
              lockReservation
              embedded
              onSaved={saved}
              onCancel={() => setActive(null)}
            />
          )
        )}
      </AdminDialog>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted">
        <span>
          {filtered.length
            ? `Mostrando ${page * 5 + 1}–${Math.min((page + 1) * 5, filtered.length)} de ${filtered.length} reservas`
            : 'Sin resultados'}
        </span>
        <div className="flex items-center gap-5">
          <button
            className="disabled:opacity-30"
            disabled={page === 0}
            onClick={() => setPage((x) => Math.max(0, x - 1))}
          >
            ← Anterior
          </button>
          <strong className="text-ink">
            Página {Math.min(page + 1, pages)} de {pages}
          </strong>
          <button
            className="disabled:opacity-30"
            disabled={page >= pages - 1}
            onClick={() => setPage((x) => x + 1)}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </section>
  );
}
