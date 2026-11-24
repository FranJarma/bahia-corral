'use client';

import { ArrowRight, CalendarDays, ChevronDown, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function nextDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
function formatDate(value: string) {
  if (!value) return 'Elegí una fecha';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'Elegí una fecha';
  const parts = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(date);
  const getPart = (type: 'day' | 'month' | 'year') =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${getPart('day')} ${getPart('month').replace('.', '')} ${getPart('year')}`;
}

export function AvailabilitySearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [today] = useState(() => nextDate(0));
  const [checkin, setCheckin] = useState(() => nextDate(1));
  const [checkout, setCheckout] = useState(() => nextDate(2));
  const [adults, setAdults] = useState(2);
  const [minors, setMinors] = useState(0);
  const [guestOpen, setGuestOpen] = useState(false);
  const [error, setError] = useState('');

  function search() {
    if (!checkin || !checkout || checkin >= checkout) {
      setError('Elegí una salida posterior a tu llegada.');
      return;
    }
    setError('');
    const params = new URLSearchParams({
      checkin,
      checkout,
      adults: String(adults),
      minors: String(minors),
    });
    router.push(`/reservar?${params}`);
  }
  return (
    <div className={`relative ${compact ? 'mx-auto max-w-[360px]' : 'w-full max-w-[884px]'}`}>
      <div
        className={`${compact ? 'flex-col gap-2 p-2' : 'flex-col p-2 lg:flex-row lg:items-center lg:gap-0 lg:p-[6px]'} flex rounded-2xl border border-[#dacbb7] bg-[#fcfaf6] shadow-[0_6px_22px_#17374719]`}
      >
        <label
          className={`relative flex min-w-0 items-center gap-2 rounded-lg px-3 ${compact ? 'h-[46px]' : 'h-12 lg:h-[46px] lg:w-[170px] lg:shrink-0'}`}
        >
          <CalendarDays className="shrink-0" size={17} aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[10px] font-semibold text-muted">Llegada</span>
            <span className="whitespace-nowrap text-[13px] font-medium leading-[18px]">
              {formatDate(checkin)}
            </span>
          </span>
          <input
            type="date"
            aria-label="Llegada"
            value={checkin}
            min={today}
            onChange={(event) => {
              setCheckin(event.target.value);
              if (event.target.value >= checkout) {
                const date = new Date(`${event.target.value}T12:00:00Z`);
                date.setUTCDate(date.getUTCDate() + 1);
                setCheckout(date.toISOString().slice(0, 10));
              }
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <ChevronDown size={13} aria-hidden="true" />
        </label>
        <span
          aria-hidden="true"
          className="my-auto hidden h-[26px] w-px shrink-0 bg-[#ddcdb8] lg:block"
        />
        <label
          className={`relative flex min-w-0 items-center gap-2 rounded-lg px-3 ${compact ? 'h-[46px]' : 'h-12 lg:h-[46px] lg:w-[170px] lg:shrink-0'}`}
        >
          <CalendarDays className="shrink-0" size={17} aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[10px] font-semibold text-muted">Salida</span>
            <span className="whitespace-nowrap text-[13px] font-medium leading-[18px]">
              {formatDate(checkout)}
            </span>
          </span>
          <input
            type="date"
            aria-label="Salida"
            value={checkout}
            min={checkin}
            onChange={(event) => setCheckout(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <ChevronDown size={13} aria-hidden="true" />
        </label>
        <span
          aria-hidden="true"
          className="my-auto hidden h-[26px] w-px shrink-0 bg-[#ddcdb8] lg:block"
        />
        <div
          className={`relative flex min-w-0 items-center ${compact ? 'h-[46px]' : 'h-12 lg:h-[46px] lg:w-[300px] lg:shrink-0'}`}
        >
          <button
            type="button"
            onClick={() => setGuestOpen(!guestOpen)}
            aria-expanded={guestOpen}
            className="flex h-full w-full items-center gap-2 rounded-lg px-3 text-left"
          >
            <Users size={18} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[10px] font-semibold text-muted">Huéspedes</span>
              <span className="truncate text-xs font-medium">
                {adults} adultos · {minors} menores
              </span>
            </span>
            <ChevronDown size={13} />
          </button>
          {guestOpen && (
            <div className="absolute top-[calc(100%+12px)] left-0 z-50 w-[min(320px,85vw)] rounded-2xl border border-[#ddcdb8] bg-cream-soft p-5 shadow-[0_12px_32px_#1737471d]">
              {(
                [
                  { label: 'Adultos', value: adults, set: setAdults, min: 1, max: 8 },
                  { label: 'Menores', value: minors, set: setMinors, min: 0, max: 8 - adults },
                ] as const
              ).map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-full border"
                      disabled={item.value <= item.min}
                      aria-label={`Quitar ${item.label}`}
                      onClick={() => item.set(item.value - 1)}
                    >
                      −
                    </button>
                    <span className="tabular-nums">{item.value}</span>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-full border"
                      disabled={item.value >= item.max}
                      aria-label={`Agregar ${item.label}`}
                      onClick={() => {
                        item.set(item.value + 1);
                        if (item.label === 'Adultos' && minors + item.value + 1 > 8)
                          setMinors(Math.max(0, 8 - item.value - 1));
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <p className="mb-4 text-[11px] leading-5 text-muted">
                Los menores de 4 años no pagan, pero cuentan para la capacidad.
              </p>
              <button
                type="button"
                className="primary-button w-full"
                onClick={() => setGuestOpen(false)}
              >
                Aplicar huéspedes
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={search}
          className={`primary-button shrink-0 text-[11px] uppercase tracking-[.015em] ${compact ? 'w-full' : 'lg:ml-auto lg:!min-h-[46px] lg:w-[229px] lg:px-4'}`}
        >
          Buscar disponibilidad <ArrowRight size={16} />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-white/90 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
