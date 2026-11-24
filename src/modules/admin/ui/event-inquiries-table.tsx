'use client';

import { useState } from 'react';

type Inquiry = {
  id: string;
  contact_name: string;
  email: string;
  phone: string;
  event_type: string;
  status: string;
  notes: string | null;
};
const states: { value: 'NEW' | 'CONTACTED' | 'CLOSED'; label: string }[] = [
  { value: 'NEW', label: 'Nueva' },
  { value: 'CONTACTED', label: 'Contactada' },
  { value: 'CLOSED', label: 'Cerrada' },
];
export function EventInquiriesTable({ initial }: { initial: Inquiry[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function update(id: string, status: 'NEW' | 'CONTACTED' | 'CLOSED') {
    setBusy(id);
    setError('');
    try {
      const response = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No se pudo actualizar');
      setItems((current) => current.map((e) => (e.id === id ? { ...e, status } : e)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar el estado');
    } finally {
      setBusy(null);
    }
  }
  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl bg-cream-soft">
        <table className="admin-table min-w-[650px]">
          <thead>
            <tr>
              {['Nombre y contacto', 'Tipo de evento', 'Estado', 'Observaciones', 'Acción'].map(
                (t) => (
                  <th key={t}>{t}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.contact_name}</strong>
                  <p className="mt-1 text-muted">{x.email}</p>
                  <p className="mt-1 text-muted">{x.phone}</p>
                </td>
                <td>{x.event_type}</td>
                <td>
                  <span
                    className={`status-pill ${x.status === 'NEW' ? 'status-pill--pending' : 'status-pill--ready'}`}
                  >
                    {states.find((s) => s.value === x.status)?.label ?? x.status}
                  </span>
                </td>
                <td className="max-w-[250px] text-muted">{x.notes ?? 'Sin observaciones'}</td>
                <td>
                  <label className="public-form-label">
                    Seguimiento
                    <select
                      className="!min-w-36"
                      disabled={busy === x.id}
                      value={x.status}
                      onChange={(e) =>
                        void update(x.id, e.target.value as 'NEW' | 'CONTACTED' | 'CLOSED')
                      }
                    >
                      {states.map((s) => (
                        <option value={s.value} key={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <p className="p-10 text-center text-sm text-muted">
            Todavía no hay consultas de eventos.
          </p>
        )}
      </div>
    </div>
  );
}
