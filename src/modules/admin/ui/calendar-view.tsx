'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';

type Entry = {
  id: string;
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
  const [busy, setBusy] = useState(false);
  const dates = useMemo(() => rows(focus, mode), [focus, mode]);
  const from = iso(dates[0]),
    to = iso(shift(dates[dates.length - 1], 1));
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/admin/calendar?from=${from}&to=${to}`, { signal: ctrl.signal, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('No se pudo cargar el calendario');
        return r.json();
      })
      .then((data: { entries: Entry[] }) => {
        if (!ctrl.signal.aborted) {
          setEntries(data.entries);
          setError('');
          setBusy(false);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setBusy(false);
          setError(e instanceof Error ? e.message : 'Error al cargar el calendario');
        }
      });
    return () => ctrl.abort();
  }, [from, to]);
  function move(n: number) {
    setBusy(true);
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
                setBusy(true);
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
              setBusy(true);
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
      <div className="mb-4 flex flex-wrap gap-3 text-[10px]">
        <span className="text-muted">Ocupación</span>
        <span className="status-pill status-pill--ready">Disponible</span>
        <span className="status-pill status-pill--cancelled">Ocupado</span>
        <span className="status-pill status-pill--confirmed">Ingreso programado</span>
        <span className="status-pill bg-[#e2e5e5] text-[#46575f]">Bloqueado</span>
        <span className="ml-3 text-muted">Limpieza</span>
        <span className="status-pill status-pill--pending">Pendiente / En limpieza</span>
        <span className="status-pill status-pill--ready">Limpio</span>
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
          <div
            className="grid border-b border-[#e7dfd2]"
            style={{ gridTemplateColumns: `150px repeat(${dates.length},minmax(0,1fr))` }}
          >
            <span className="p-3 text-[11px] font-semibold">Alojamiento</span>
            {dates.map((d) => (
              <span
                key={iso(d)}
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
          {PUBLIC_UNITS.map((unit) => (
            <div
              key={unit.slug}
              className="grid border-b border-[#e7dfd2] last:border-0"
              style={{ gridTemplateColumns: '150px minmax(0,1fr)' }}
            >
              <div className="flex min-h-[64px] flex-col justify-center p-3">
                <strong className="text-[11px]">{unit.name}</strong>
              </div>
              <div
                className="relative grid"
                style={{
                  gridTemplateColumns: `repeat(${dates.length},minmax(0,1fr))`,
                  backgroundImage: `linear-gradient(to right,transparent calc(100% - 1px),#e7dfd2 calc(100% - 1px))`,
                  backgroundSize: `${100 / dates.length}% 100%`,
                }}
              >
                {entries
                  .filter((e) => e.unit_name === unit.name)
                  .map((entry) => {
                    const start = Math.max(
                      0,
                      Math.round(
                        (Date.parse(`${entry.checkin}T00:00:00Z`) -
                          Date.parse(`${from}T00:00:00Z`)) /
                          DAY,
                      ),
                    );
                    const end = Math.min(
                      dates.length,
                      Math.round(
                        (Date.parse(`${entry.checkout}T00:00:00Z`) -
                          Date.parse(`${from}T00:00:00Z`)) /
                          DAY,
                      ),
                    );
                    if (end <= start) return null;
                    const blocked = entry.reason !== 'RESERVATION';
                    const color = blocked
                      ? 'bg-[#e0e4e5] text-[#4c5c62]'
                      : entry.status === 'PENDING_CONFIRMATION'
                        ? 'bg-[#fff0cc] text-[#825416]'
                        : ['IN_STAY'].includes(entry.status ?? '')
                          ? 'bg-[#f8e2de] text-[#9b3636]'
                          : 'bg-[#dceaf4] text-[#1d577f]';
                    return (
                      <div
                        key={entry.id}
                        className={`absolute top-[9%] flex h-[82%] flex-col justify-center overflow-hidden rounded-lg p-2 text-[10px] ${color}`}
                        style={{
                          left: `calc(${start} * 100% / ${dates.length} + 3px)`,
                          width: `calc(${end - start} * 100% / ${dates.length} - 6px)`,
                        }}
                      >
                        <strong className="truncate">{entry.guest_name ?? 'Mantenimiento'}</strong>
                        <span className="truncate">
                          {entry.checkin.slice(8)}–{entry.checkout.slice(8)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-[11px] text-muted">
          Una salida y una llegada pueden coincidir el mismo día.
        </p>
        <Link className="secondary-button" href="/admin/reservas/nueva">
          Reserva manual
        </Link>
      </div>
    </div>
  );
}
