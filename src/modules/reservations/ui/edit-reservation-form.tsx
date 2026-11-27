'use client';
import { useEffect, useState } from 'react';

import type { ReservationEditDetails } from '@/modules/reservations/application/get-reservation-for-edit';
import { DatePicker } from '@/modules/shared-ui/date-picker';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

type Unit = {
  id: string;
  name: string;
  capacity_total: number;
  published: boolean;
  operational_status: string;
};
async function read<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: 'no-store' });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'No se pudieron cargar los datos de la reserva.');
  return data;
}
export function EditReservationForm({
  reservationId,
  onSaved,
  onCancel,
}: {
  reservationId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ReservationEditDetails | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [reason, setReason] = useState(''),
    [error, setError] = useState('');
  const [childCount, setChildCount] = useState('0');
  const [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      read<{ reservation: ReservationEditDetails }>(
        '/api/admin/reservations/' + reservationId,
        controller.signal,
      ),
      read<{ units: Unit[] }>('/api/admin/units', controller.signal),
    ])
      .then(([data, options]) => {
        if (controller.signal.aborted) return;
        setDraft(data.reservation);
        setChildCount(String(data.reservation.childAges.length));
        setUnits(
          options.units.filter(
            (u) =>
              u.id === data.reservation.unitId ||
              (u.published && u.operational_status === 'ACTIVE'),
          ),
        );
        setError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'No se pudo cargar la reserva.');
      });
    return () => controller.abort();
  }, [reservationId, attempt]);
  const selected = units.find((u) => u.id === draft?.unitId);
  if (!draft)
    return (
      <div className="grid gap-4">
        {error ? (
          <>
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
            <button
              type="button"
              className="secondary-button justify-self-start"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Reintentar
            </button>
          </>
        ) : (
          <p role="status" className="text-sm text-muted">
            Cargando reserva…
          </p>
        )}
        <button type="button" className="secondary-button justify-self-end" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    );
  const editable = ['CONFIRMED', 'IN_STAY'].includes(draft.status);
  async function submit() {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/reservations/' + reservationId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'modify',
          unitId: draft.unitId,
          checkin: draft.checkin,
          checkout: draft.checkout,
          adults: draft.adults,
          childAges: draft.childAges,
          reason,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No se pudo guardar la reserva.');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la reserva.');
    } finally {
      setBusy(false);
    }
  }
  function change<K extends keyof ReservationEditDetails>(
    key: K,
    value: ReservationEditDetails[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="text-xs leading-6 text-muted">
        Los cambios de fechas, alojamiento u ocupantes recalculan la tarifa. Los pagos registrados
        se conservan.
      </p>
      {!editable && (
        <p role="status" className="text-sm text-muted">
          La edición está disponible para reservas confirmadas o en estadía.
        </p>
      )}
      <fieldset disabled={busy || !editable} className="contents">
        <ValidatedLabel className="public-form-label">
          Alojamiento
          <select required value={draft.unitId} onChange={(e) => change('unitId', e.target.value)}>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} · {unit.capacity_total} personas
              </option>
            ))}
          </select>
        </ValidatedLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <ValidatedLabel className="public-form-label">
            Ingreso
            <DatePicker onValueChange={(value) => change('checkin', value)}>
              <input
                required
                type="date"
                value={draft.checkin}
                onChange={(e) => change('checkin', e.target.value)}
              />
            </DatePicker>
          </ValidatedLabel>
          <ValidatedLabel className="public-form-label">
            Salida
            <DatePicker onValueChange={(value) => change('checkout', value)}>
              <input
                required
                type="date"
                min={draft.checkin}
                value={draft.checkout}
                onChange={(e) => change('checkout', e.target.value)}
              />
            </DatePicker>
          </ValidatedLabel>
          <ValidatedLabel className="public-form-label">
            Adultos
            <input
              required
              type="number"
              min={1}
              max={Math.max(1, (selected?.capacity_total ?? 50) - draft.childAges.length)}
              value={draft.adults}
              onChange={(e) => change('adults', Number(e.target.value))}
            />
          </ValidatedLabel>
          <ValidatedLabel className="public-form-label">
            Menores
            <input
              required
              type="number"
              min={0}
              max={Math.max(0, (selected?.capacity_total ?? 50) - draft.adults)}
              value={childCount}
              onChange={(e) => {
                const value = e.target.value;
                setChildCount(value);
                if (value === '') return;
                const count = Number(value);
                if (Number.isInteger(count) && count >= 0 && count <= 50)
                  change(
                    'childAges',
                    Array.from({ length: count }, (_, i) => draft.childAges[i] ?? 0),
                  );
              }}
            />
          </ValidatedLabel>
        </div>
        {draft.childAges.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {draft.childAges.map((age, index) => (
              <ValidatedLabel key={index} className="public-form-label">
                Edad del menor {index + 1}
                <input
                  required
                  type="number"
                  min={0}
                  max={17}
                  value={age}
                  onChange={(e) =>
                    change(
                      'childAges',
                      draft.childAges.map((value, i) =>
                        i === index ? Number(e.target.value) : value,
                      ),
                    )
                  }
                />
              </ValidatedLabel>
            ))}
          </div>
        )}
        <ValidatedLabel className="public-form-label">
          Motivo del cambio
          <textarea
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </ValidatedLabel>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="admin-form-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button" disabled={busy || !editable}>
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
