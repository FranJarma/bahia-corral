'use client';
import { useState } from 'react';
export function EventInquiryForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <form
      className="surface-card grid gap-4 p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        const form = new FormData(e.currentTarget);
        const data = Object.fromEntries(form.entries());
        try {
          const r = await fetch('/api/public/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, guestsCount: Number(data.guestsCount) || undefined }),
          });
          const response = (await r.json()) as { message?: string; error?: string };
          if (!r.ok) throw new Error(response.error ?? 'Error');
          setMessage(response.message ?? 'Consulta enviada.');
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'No pudimos enviar tu consulta');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="editorial text-2xl">Solicitá un presupuesto</h2>
      <label className="grid gap-2 text-sm font-semibold">
        Nombre y apellido
        <input required name="contactName" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Correo
          <input required type="email" name="email" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Teléfono
          <input required name="phone" type="tel" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        Tipo de evento
        <select name="eventType">
          <option value="Social">Social</option>
          <option value="Corporativo">Corporativo</option>
          <option value="Otro">Otro</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Fecha estimada
          <input type="date" name="preferredDate" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Invitados aproximados
          <input type="number" name="guestsCount" min="1" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        Contanos tu idea
        <textarea
          rows={4}
          name="notes"
          placeholder="Espacios, horarios, alojamiento y necesidades especiales"
        />
      </label>
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
      <button className="primary-button" disabled={busy}>
        {busy ? 'Enviando…' : 'Enviar consulta'}
      </button>
    </form>
  );
}
