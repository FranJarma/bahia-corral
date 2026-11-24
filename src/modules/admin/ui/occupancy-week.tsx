import Link from 'next/link';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';
import type { ReservationSummary } from '@/modules/reservations/application/list-reservations';

type Occupancy = Pick<
  ReservationSummary,
  'id' | 'guest_name' | 'unit_name' | 'checkin' | 'checkout' | 'status'
>;

const oneDay = 86400000;
function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
function startOfWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}
export function OccupancyWeek({
  reservations,
  referenceDate = new Date(),
  compact = false,
}: {
  reservations: Occupancy[];
  referenceDate?: Date;
  compact?: boolean;
}) {
  const monday = startOfWeek(referenceDate);
  const days = Array.from({ length: 7 }, (_, index) => new Date(monday.getTime() + index * oneDay));
  const from = isoDate(days[0]);
  const until = isoDate(new Date(days[6].getTime() + oneDay));
  const rangeLabel = `${new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(days[0])}–${new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(days[6])}`;
  return (
    <section aria-label="Calendario semanal de ocupación" className="mt-7">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h2 className="editorial text-[25px]">Calendario de ocupación</h2>
        <span className="text-[11px] font-semibold text-muted">{rangeLabel}</span>
        <Link href="/admin/calendario" className="text-[11px] font-semibold hover:underline">
          Ver calendario →
        </Link>
      </header>
      <div className="mb-4 flex flex-wrap gap-3 text-[10px]">
        <span className="status-pill status-pill--ready">Disponible</span>
        <span className="status-pill status-pill--confirmed">Confirmada</span>
        <span className="status-pill status-pill--pending">Por confirmar</span>
        <span className="status-pill bg-[#e5e8e8] text-[#47585c]">Bloqueada</span>
      </div>
      <div className="overflow-x-auto rounded-[14px] bg-cream-soft">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[136px_repeat(7,minmax(0,1fr))] border-b border-[#ddd9d0] py-3 text-center text-[10px] font-semibold text-ink">
            <span className="pl-3 text-left text-muted">Alojamiento</span>
            {days.map((d) => (
              <span key={d.toISOString()}>
                {new Intl.DateTimeFormat('es-AR', {
                  weekday: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                }).format(d)}
              </span>
            ))}
          </div>
          {PUBLIC_UNITS.map((unit) => {
            const entries = reservations.filter(
              (r) =>
                r.unit_name === unit.name &&
                r.checkout > from &&
                r.checkin < until &&
                !['CANCELLED', 'NOT_COMPLETED'].includes(r.status),
            );
            return (
              <div
                key={unit.code}
                className={`grid grid-cols-[136px_minmax(0,1fr)] border-b border-[#ddd9d0] last:border-b-0 ${compact ? 'min-h-[55px]' : 'min-h-[66px]'}`}
              >
                <Link
                  href="/admin/cabanas"
                  className="flex items-center px-3 text-[11px] font-semibold"
                >
                  {unit.name}
                </Link>
                <div className="relative grid grid-cols-7 items-center bg-[linear-gradient(to_right,transparent_calc(100%-1px),#e7e2d8_calc(100%-1px))] bg-[length:calc(100%/7)_100%]">
                  {entries.map((entry) => {
                    const left = Math.max(
                      0,
                      Math.floor(
                        (Date.parse(`${entry.checkin}T00:00:00Z`) - monday.getTime()) / oneDay,
                      ),
                    );
                    const right = Math.min(
                      7,
                      Math.ceil(
                        (Date.parse(`${entry.checkout}T00:00:00Z`) - monday.getTime()) / oneDay,
                      ),
                    );
                    if (right <= left) return null;
                    const confirmed = ['CONFIRMED', 'IN_STAY', 'FINISHED'].includes(entry.status);
                    return (
                      <Link
                        key={entry.id}
                        href={`/admin/reservas/${entry.id}`}
                        title={`${entry.guest_name} · ${entry.checkin} al ${entry.checkout}`}
                        style={{
                          left: `calc(${left} * 100% / 7 + 4px)`,
                          width: `calc(${right - left} * 100% / 7 - 8px)`,
                        }}
                        className={`absolute top-[12%] flex h-[76%] min-w-0 flex-col justify-center overflow-hidden rounded-md px-2 text-[10px] ${confirmed ? 'bg-[#173747] text-white' : 'bg-[#fff0cc] text-[#835014]'}`}
                      >
                        <strong className="truncate">{entry.guest_name}</strong>
                        <span className="mt-0.5 truncate opacity-80">
                          {entry.checkin.slice(8)}–{entry.checkout.slice(8)} ·{' '}
                          {confirmed ? 'Confirmada' : 'Por confirmar'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted">
        Reservas por noche · Ingreso 15:00 · Salida 10:00.
      </p>
    </section>
  );
}
