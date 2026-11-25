'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { ReservationSummary } from '@/modules/reservations/application/list-reservations';
import { SearchField } from '@/modules/shared-ui/search-field';

const statuses: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  PENDING_CONFIRMATION: 'Por confirmar',
  IN_STAY: 'En estadía',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
  NOT_COMPLETED: 'No completada',
  NO_SHOW: 'No se presentó',
};
const archivedStatuses = ['FINISHED', 'CANCELLED', 'NOT_COMPLETED', 'NO_SHOW'];
function peso(value: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(BigInt(value)) / 100);
}
function date(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

export function ReservationsTable({ rows }: { rows: ReservationSummary[] }) {
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
      <div className="overflow-x-auto rounded-[12px] bg-cream-soft">
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
              return (
                <tr key={r.id}>
                  <td>
                    <Link
                      className="font-semibold hover:underline"
                      href={`/admin/reservas/${r.id}`}
                    >
                      {r.reference}
                    </Link>
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
                    <div className="flex items-center gap-3">
                      <Link
                        className="whitespace-nowrap text-[11px] font-semibold hover:underline"
                        href={`/admin/reservas/${r.id}`}
                      >
                        Ver detalle
                      </Link>
                      {paid < total && (
                        <Link
                          className="whitespace-nowrap text-[11px] font-semibold hover:underline"
                          href={`/admin/reservas/${r.id}`}
                        >
                          Registrar pago
                        </Link>
                      )}
                      <details className="relative">
                        <summary className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-[11px] font-semibold">
                          Más acciones <ChevronDown size={13} />
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 min-w-[165px] rounded-lg border border-[#d8d3c9] bg-white p-2 shadow-lg">
                          <Link
                            href={`/admin/reservas/${r.id}`}
                            className="block px-3 py-2 hover:bg-cream"
                          >
                            Administrar reserva
                          </Link>
                        </div>
                      </details>
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
