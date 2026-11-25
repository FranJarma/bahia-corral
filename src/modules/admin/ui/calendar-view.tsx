'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { NewReservationDialog } from '@/modules/admin/ui/new-reservation-dialog';

type Entry = {
  id: string;
  unit_id: string;
  unit_name: string;
  checkin: string;
  checkout: string;
  reason: string;
  guest_name: string | null;
  status: string | null;
};
type Mode = 'DAY' | 'WEEK' | 'MONTH';
const DAY = 86400000;
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function shift(d: Date, days: number) {
  return new Date(d.getTime() + days * DAY);
}
function monday(d: Date) {
  const v = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return shift(v, -(v.getUTCDay() + 6) % 7);
}
function dateLabel(d: Date) {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
function rows(date: Date, mode: Mode) {
  if (mode === 'DAY') return [date];
  if (mode === 'WEEK') return Array.from({ length: 7 }, (_, i) => shift(monday(date), i));
  return Array.from(
    { length: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate() },
    (_, i) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), i + 1)),
  );
}
export function CalendarView() {
  const [focus, setFocus] = useState(() => new Date());
  const [mode, setMode] = useState<Mode>('WEEK');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState('');
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [loadedRange, setLoadedRange] = useState('');
  const [revision, setRevision] = useState(0);
  const dates = useMemo(() => rows(focus, mode), [focus, mode]);
  const from = iso(dates[0]),
    to = iso(shift(dates[dates.length - 1], 1));
  const range = from + to + revision;
  const busy = loadedRange !== range;
  const columns = `150px repeat(${dates.length},minmax(0,1fr))`;
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/admin/calendar?from=${from}&to=${to}`, { signal: ctrl.signal, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('No se pudo cargar el calendario');
        return r.json();
      })
      .then((data: { entries: Entry[]; units: { id: string; name: string }[] }) => {
        if (!ctrl.signal.aborted) {
          setEntries(data.entries);
          setUnits(data.units);
          setError('');
          setLoadedRange(range);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setLoadedRange(range);
          setError(e instanceof Error ? e.message : 'Error al cargar el calendario');
        }
      });
    return () => ctrl.abort();
  }, [from, to, range]);
  function move(n: number) {
    setFocus((current) =>
      mode === 'MONTH'
        ? new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + n, 1))
        : shift(current, n * (mode === 'WEEK' ? 7 : 1)),
    );
  }
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-cream-soft p-1">
          {(['DAY', 'WEEK', 'MONTH'] as const).map((key) => (
            <button
              key={key}
              onClick={() => {
                setMode(key);
              }}
              className={`rounded-full px-4 py-2 text-[11px] font-semibold ${mode === key ? 'bg-ink text-white' : 'hover:bg-[#f1ece4]'}`}
            >
              {key === 'DAY' ? 'Día' : key === 'WEEK' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
        <strong className="text-xs">
          {mode === 'MONTH'
            ? new Intl.DateTimeFormat('es-AR', {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              }).format(focus)
            : `${dateLabel(dates[0])}${dates.length > 1 ? ` – ${dateLabel(dates[dates.length - 1])}` : ''}`}
        </strong>
        <div className="flex gap-2">
          <button
            className="secondary-button !min-h-10 !px-4"
            onClick={() => {
              setFocus(new Date());
            }}
          >
            Hoy
          </button>
          <button
            aria-label="Anterior"
            className="secondary-button !min-h-10 !px-3"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Siguiente"
            className="secondary-button !min-h-10 !px-3"
            onClick={() => move(1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px]">
        <div className="flex flex-wrap items-center gap-2" aria-label="Estados de ocupación">
          <span className="mr-1 text-muted">Ocupación</span>
          <span className="status-pill status-pill--ready">Disponible</span>
          <span className="status-pill status-pill--cancelled">Ocupado</span>
          <span className="status-pill status-pill--confirmed">Ingreso programado</span>
          <span className="status-pill bg-[#e2e5e5] text-[#46575f]">Bloqueado</span>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Estados de limpieza">
          <span className="mr-1 text-muted">Limpieza</span>
          <span className="status-pill status-pill--pending">Pendiente / En limpieza</span>
          <span className="status-pill status-pill--ready">Limpio</span>
        </div>
      </div>
      {error && (
        <p role="alert" className="my-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="my-4 text-sm text-muted">
          Actualizando calendario…
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl bg-cream-soft">
        <div style={{ minWidth: mode === 'MONTH' ? '1400px' : '700px' }}>
          <div className="grid border-b border-[#e7dfd2]" style={{ gridTemplateColumns: columns }}>
            <span className="p-3 text-[11px] font-semibold">Alojamiento</span>
            {dates.map((d) => (
              <span
                key={iso(d)}
                data-calendar-date={iso(d)}
                className="border-l border-[#eae5dc] py-3 text-center text-[11px] font-semibold"
              >
                {new Intl.DateTimeFormat('es-AR', {
                  weekday: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                }).format(d)}
              </span>
            ))}
          </div>
          {units.map((unit) => (
            <div
              key={unit.id}
              data-unit-id={unit.id}
              className="grid border-b border-[#e7dfd2] last:border-0"
              style={{ gridTemplateColumns: columns }}
            >
              <div
                className="flex min-h-[72px] items-center p-3"
                style={{ gridColumn: 1, gridRow: 1 }}
              >
                <strong className="text-[11px]">{unit.name}</strong>
              </div>
              {dates.map((day, index) => (
                <div
                  aria-hidden="true"
                  key={iso(day)}
                  className="min-h-[72px] border-l border-[#e7dfd2]"
                  style={{ gridColumn: index + 2, gridRow: 1 }}
                />
              ))}
              {entries
                .filter((entry) => entry.unit_id === unit.id)
                .map((entry) => {
                  const start = Math.max(
                    0,
                    Math.round(
                      (Date.parse(entry.checkin + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) /
                        DAY,
                    ),
                  );
                  const end = Math.min(
                    dates.length,
                    Math.round(
                      (Date.parse(entry.checkout + 'T00:00:00Z') -
                        Date.parse(from + 'T00:00:00Z')) /
                        DAY,
                    ),
                  );
                  if (end <= start) return null;
                  const blocked = entry.reason === 'ADMIN_BLOCK';
                  const color = blocked
                    ? 'bg-[#e0e4e5] text-[#4c5c62]'
                    : entry.reason === 'HOLD' || entry.status === 'PENDING_CONFIRMATION'
                      ? 'bg-[#fff0cc] text-[#825416]'
                      : entry.status === 'IN_STAY'
                        ? 'bg-[#f8e2de] text-[#9b3636]'
                        : 'bg-[#dceaf4] text-[#1d577f]';
                  const title =
                    entry.guest_name ?? (blocked ? 'Mantenimiento' : 'Reserva en proceso');
                  return (
                    <div
                      key={entry.id}
                      data-calendar-entry={entry.id}
                      title={title + ' · ' + entry.checkin + ' al ' + entry.checkout}
                      className={
                        'z-[1] flex min-w-0 flex-col justify-center overflow-hidden rounded-lg px-2 py-2 text-[10px] ' +
                        color
                      }
                      style={{
                        gridColumn: start + 2 + ' / ' + (end + 2),
                        gridRow: 1,
                        margin: '6px 3px',
                      }}
                    >
                      <strong className="truncate">{title}</strong>
                      <span className="truncate">
                        {entry.checkin.slice(8)}–{entry.checkout.slice(8)}
                      </span>
                    </div>
                  );
                })}
            </div>
          ))}
          {!busy && !units.length && (
            <p className="p-6 text-sm text-muted">Todavía no hay alojamientos registrados.</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-[11px] text-muted">
          Una salida y una llegada pueden coincidir el mismo día.
        </p>
        <NewReservationDialog
          label="Reserva manual"
          secondary
          onCreated={() => setRevision((value) => value + 1)}
        />
      </div>
    </div>
  );
}
