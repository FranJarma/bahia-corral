'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Unit = {
  unit_id: string;
  name: string;
  cleaning: string;
  guest_name: string | null;
  checkin: string | null;
  checkout: string | null;
  reservation_status: string | null;
};
function todayString() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
}
export function ReceptionScreen() {
  const [today, setToday] = useState(() => todayString());
  const [units, setUnits] = useState<Unit[]>([]);
  const [updated, setUpdated] = useState('');
  const [error, setError] = useState('');
  async function refresh() {
    try {
      const response = await fetch('/api/admin/reception', { cache: 'no-store' });
      const data = (await response.json()) as {
        units: Unit[];
        lastUpdated: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? 'No se pudo actualizar la pantalla');
      setUnits(data.units);
      setUpdated(data.lastUpdated);
      setToday(todayString());
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar recepción');
    }
  }
  useEffect(() => {
    queueMicrotask(() => void refresh());
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const arrivals = units.filter((unit) => unit.checkin === today && unit.guest_name);
  const departures = units.filter((unit) => unit.checkout === today && unit.guest_name);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold">Movimientos del día</h2>
          <p className="mt-1 text-[11px] text-muted">
            Última actualización:{' '}
            {updated ? new Date(updated).toLocaleTimeString('es-AR') : 'Pendiente'} · cada 15
            segundos
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="secondary-button" href="/admin/calendario">
            Ver calendario
          </Link>
          <button className="secondary-button" onClick={() => void refresh()}>
            Actualizar ahora
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-900">
          {error}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="admin-panel p-6">
          <h2 className="editorial mb-6 text-[23px]">Ingresos · desde las 15:00</h2>
          <div className="divide-y divide-[#e2d8cd]">
            {arrivals.map((unit) => (
              <article key={unit.unit_id} className="py-4 first:pt-0">
                <h3 className="text-sm font-semibold">{unit.guest_name}</h3>
                <p className="mt-1 text-xs text-muted">{unit.name}</p>
                <span
                  className={`status-pill mt-2 ${unit.cleaning === 'READY' ? 'status-pill--ready' : 'status-pill--pending'}`}
                >
                  {unit.cleaning === 'READY' ? 'Limpio' : 'Pendiente de limpieza'}
                </span>
                <div className="mt-3">
                  <Link
                    className="text-[11px] font-semibold hover:underline"
                    href={unit.cleaning === 'READY' ? '/admin/reservas' : '/admin/limpieza'}
                  >
                    {unit.cleaning === 'READY' ? 'Consultar reserva' : 'Ir a Limpieza'} →
                  </Link>
                </div>
              </article>
            ))}
            {!arrivals.length && (
              <p className="py-6 text-xs text-muted">No hay ingresos programados para hoy.</p>
            )}
          </div>
        </section>
        <section className="admin-panel p-6">
          <h2 className="editorial mb-6 text-[23px]">Salidas · hasta las 10:00</h2>
          <div className="divide-y divide-[#e2d8cd]">
            {departures.map((unit) => (
              <article className="py-4 first:pt-0" key={unit.unit_id}>
                <h3 className="text-sm font-semibold">{unit.guest_name}</h3>
                <p className="mt-1 text-xs text-muted">{unit.name}</p>
                <p className="mt-3 text-xs text-muted">
                  Al registrar la salida se podrá coordinar la limpieza.
                </p>
                <Link
                  className="mt-4 inline-block text-[11px] font-semibold hover:underline"
                  href="/admin/reservas"
                >
                  Ver detalle de la reserva →
                </Link>
              </article>
            ))}
            {!departures.length && (
              <p className="py-6 text-xs text-muted">No hay salidas programadas para hoy.</p>
            )}
          </div>
        </section>
      </div>
      <section className="mt-7">
        <h2 className="editorial mb-3 text-[23px]">Preparación de los alojamientos</h2>
        <div className="grid gap-2 rounded-xl bg-cream-soft p-4 sm:grid-cols-2 xl:grid-cols-6">
          {units.map((unit) => (
            <div key={unit.unit_id} className="p-2">
              <h3 className="mb-2 text-[11px] font-semibold">{unit.name}</h3>
              <span
                className={`status-pill ${unit.cleaning === 'READY' ? 'status-pill--ready' : 'status-pill--pending'}`}
              >
                {unit.cleaning === 'READY'
                  ? 'Limpio'
                  : unit.cleaning === 'IN_PROGRESS'
                    ? 'En limpieza'
                    : 'Pendiente'}
              </span>
            </div>
          ))}
        </div>
      </section>
      <p className="mt-5 text-[11px] text-muted">
        Las reservas se consultan en el Calendario y los cobros en el detalle de cada reserva.
      </p>
    </div>
  );
}
