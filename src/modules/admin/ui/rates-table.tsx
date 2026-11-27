'use client';

import { ArrowRight, X } from 'lucide-react';
import { useState } from 'react';

import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

type RateRow = {
  unit_id: string;
  name: string;
  capacity_total: number;
  min_guests: number;
  max_guests: number;
  amount_cents: string;
};
function price(value: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(BigInt(value)) / 100);
}
export function RatesTable({ initial }: { initial: RateRow[] }) {
  const [rates, setRates] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const active = rates
    .filter((r) => r.unit_id === editing)
    .sort((a, b) => a.min_guests - b.min_guests);
  function edit(unitId: string) {
    setMessage('');
    setEditing(unitId);
    setDraft(
      Object.fromEntries(
        rates
          .filter((r) => r.unit_id === unitId)
          .map((r) => [String(r.min_guests), String(Number(BigInt(r.amount_cents)) / 100)]),
      ),
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMessage('');
    try {
      const bands = active.map((row) => ({
        minGuests: row.min_guests,
        maxGuests: row.max_guests,
        amountCents: String(Math.round(Number(draft[String(row.min_guests)]) * 100)),
      }));
      if (bands.some((b) => !/^\d+$/.test(b.amountCents) || BigInt(b.amountCents) <= 0n))
        throw new Error('Ingresá importes válidos y mayores que cero.');
      const response = await fetch('/api/admin/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: editing, bands }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No pudimos actualizar las tarifas');
      setRates((rows) =>
        rows.map((row) =>
          row.unit_id === editing
            ? {
                ...row,
                amount_cents:
                  bands.find((b) => b.minGuests === row.min_guests)?.amountCents ??
                  row.amount_cents,
              }
            : row,
        ),
      );
      setEditing(null);
      setMessage(
        'Tarifa actualizada. Los importes históricos de reservas existentes se conservan.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar las tarifas.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <p className="mb-5 text-[12px] text-muted">
        Tarifas base por ocupación · Vigentes desde la fecha configurada para el complejo
      </p>
      <div className="overflow-x-auto rounded-2xl bg-cream-soft">
        <table className="admin-table min-w-[620px]">
          <thead>
            <tr>
              <th>Alojamiento</th>
              <th>Ocupación para tarifa</th>
              <th>Precio por noche</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <tr key={`${rate.unit_id}:${rate.min_guests}`}>
                <td className="font-semibold">{rate.name}</td>
                <td>
                  {rate.min_guests === rate.max_guests
                    ? `${rate.min_guests} persona${rate.min_guests === 1 ? '' : 's'}`
                    : `${rate.min_guests}–${rate.max_guests} personas`}
                </td>
                <td className="font-semibold">{price(rate.amount_cents)}</td>
                <td>
                  <button
                    onClick={() => edit(rate.unit_id)}
                    className="text-[11px] font-semibold hover:underline"
                  >
                    Editar tarifa <ArrowRight className="inline" size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rates.length === 0 && <p className="p-8 text-xs text-muted">No se encontraron tarifas.</p>}
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-4 text-[11px] text-muted">
        <span>Mostrando {rates.length} tarifas base</span>
        <span>Los menores de 4 años no pagan. Todos cuentan para la capacidad.</span>
      </div>
      {message && (
        <p className="mt-4 rounded-xl bg-cream-soft p-4 text-xs" role="status">
          {message}
        </p>
      )}
      {editing && (
        <div
          role="presentation"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#17374780] p-4"
          onClick={() => setEditing(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Editar tarifas de alojamiento"
            className="max-h-[90dvh] w-full max-w-[620px] overflow-y-auto rounded-2xl bg-cream-soft p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="editorial text-[27px]">Editar tarifa</h2>
              <button
                className="flex h-11 w-11 items-center justify-center"
                aria-label="Cerrar"
                onClick={() => setEditing(null)}
              >
                <X size={21} />
              </button>
            </div>
            <p className="my-4 text-sm text-muted">
              {active[0]?.name} · Actualizá los importes de cada tramo de ocupación.
            </p>
            <form onSubmit={(event) => void submit(event)} className="grid gap-4">
              {active.map((rate) => (
                <ValidatedLabel key={rate.min_guests} className="public-form-label">
                  {rate.min_guests} a {rate.max_guests} huéspedes que pagan
                  <input
                    required
                    min="1"
                    step="1"
                    type="number"
                    value={draft[String(rate.min_guests)] ?? ''}
                    onChange={(e) => setDraft((v) => ({ ...v, [rate.min_guests]: e.target.value }))}
                  />
                </ValidatedLabel>
              ))}
              <div className="mt-2 flex justify-end gap-3">
                <button type="button" className="secondary-button" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
                <button className="primary-button" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar tarifas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
