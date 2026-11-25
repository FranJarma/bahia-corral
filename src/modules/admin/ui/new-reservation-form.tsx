'use client';
import { useEffect, useState } from 'react';

import { DatePicker } from '@/modules/shared-ui/date-picker';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

type Unit = {
  id: string;
  name: string;
  capacity_total: number;
  published: boolean;
  operational_status: string;
};
export function NewReservationForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmWithoutDeposit, setConfirmWithoutDeposit] = useState(true);
  const [reason, setReason] = useState('Reserva recibida telefónicamente; pago pendiente');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/units', { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as { units?: Unit[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? 'No se pudieron cargar los alojamientos.');
        return data.units ?? [];
      })
      .then((all) => {
        if (controller.signal.aborted) return;
        const available = all.filter(
          (unit) => unit.published && unit.operational_status === 'ACTIVE',
        );
        setUnits(available);
        setUnitId(available[0]?.id ?? '');
        if (!available.length) setMessage('No hay alojamientos habilitados para recibir reservas.');
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setMessage(
            error instanceof Error ? error.message : 'No se pudieron cargar los alojamientos.',
          );
      });
    return () => controller.abort();
  }, []);
  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/admin/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          checkin,
          checkout,
          adults,
          childAges: [],
          contact: { firstName, lastName, phone, email: email || undefined },
          confirmWithoutDeposit,
          reason,
        }),
      });
      const d = (await r.json()) as { error?: string; reservationId?: string; reference?: string };
      if (!r.ok) throw new Error(d.error ?? 'No se pudo crear la reserva');
      if (!d.reservationId)
        throw new Error(
          'No se pudo comprobar la reserva. Consultá el listado antes de reintentar.',
        );
      onSuccess(d.reference ?? '');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No pudo crearse');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <ValidatedLabel className="grid gap-2 text-sm font-semibold">
        Alojamiento
        <select required value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.capacity_total} personas
            </option>
          ))}
        </select>
      </ValidatedLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        <ValidatedLabel className="grid gap-2 text-sm font-semibold">
          Ingreso
          <DatePicker onValueChange={setCheckin}><input
            required
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
          /></DatePicker>
        </ValidatedLabel>
        <ValidatedLabel className="grid gap-2 text-sm font-semibold">
          Salida
          <DatePicker onValueChange={setCheckout}><input
            required
            min={checkin}
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
          /></DatePicker>
        </ValidatedLabel>
      </div>
      <ValidatedLabel className="grid gap-2 text-sm font-semibold">
        Adultos
        <input
          required
          type="number"
          min="1"
          max={units.find((unit) => unit.id === unitId)?.capacity_total ?? 50}
          value={adults}
          onChange={(e) => setAdults(Number(e.target.value))}
        />
      </ValidatedLabel>
      <div className="grid gap-4 sm:grid-cols-2">
        <ValidatedLabel className="grid gap-2 text-sm font-semibold">
          Nombre
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </ValidatedLabel>
        <ValidatedLabel className="grid gap-2 text-sm font-semibold">
          Apellido
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </ValidatedLabel>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ValidatedLabel className="grid gap-2 text-sm font-semibold">
          Teléfono
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </ValidatedLabel>
        <label className="grid gap-2 text-sm font-semibold">
          Correo (opcional)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={confirmWithoutDeposit}
          onChange={(e) => setConfirmWithoutDeposit(e.target.checked)}
        />
        Confirmar ahora sin cobrar seña
      </label>
      {confirmWithoutDeposit && (
        <ValidatedLabel className="grid gap-2 text-sm font-semibold">
          Motivo de la excepción
          <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </ValidatedLabel>
      )}
      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
      <div className="admin-form-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button" disabled={busy || !unitId}>
          {busy ? 'Registrando…' : 'Crear reserva'}
        </button>
      </div>
    </form>
  );
}
